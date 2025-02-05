import { TextlintRuleReporter } from "@textlint/types";
import { createIndex, ItemGroup, Midashi } from "./create-index";
import { SudachiSynonyms } from "sudachi-synonyms-dictionary-kurai-forked-ver";
import { wrapReportHandler } from "textlint-rule-helper";
import { tokenize } from "kuromojin";
import TinySegmenter from "tiny-segmenter";

const segmenter = new TinySegmenter();

export interface Options {
    /**
     * 許可するワードの配列
     * ワードは完全一致で比較し、一致した場合は無視されます
     * 例) ["ウェブアプリ", "ウェブアプリケーション"]
     */
    allows?: string[];
    /**
     * 同じ語形の語の中でのアルファベットの表記揺れを許可するかどうか
     * trueの場合はカタカナとアルファベットの表記ゆれを許可します
     * 例) 「ブログ」と「blog」
     * Default: true
     */
    allowAlphabet?: boolean;
    /**
     * 同じ語形の語の中での漢数字と数字の表記ゆれを許可するかどうか
     * trueの場合は漢数字と数字の表記ゆれを許可します
     * 例) 「1」と「一」
     * Default: true
     */
    allowNumber?: boolean;
    /**
     * 語彙素の異なる同義語を許可するかどうか
     * trueの場合は語彙素の異なる同義語を許可します
     * 例) 「ルーム」と「部屋」
     * Default: true
     */
    allowLexeme?: boolean;
}

export const DefaultOptions: Required<Options> = {
    allows: [],
    allowAlphabet: true,
    allowNumber: true,
    allowLexeme: true
};

/**
 * TinySegmenter と Kuromoji の結果を単純にすべて結合し、元テキスト内の開始・終了位置を付与した配列を返す関数。
 * 「大きい単語」の中に含まれる「小さい単語」を意図的にスキップするロジックを取り払っているため、
 * 大きい単位・小さい単位ともに可能な限り取得し、結果としてすべてを matchSegment に渡す。
 *
 * 重複(同じ開始位置 + 同じテキスト)は1つにまとめる。
 */
function mergeSegments(
    original: string,
    segmentsA: string[],
    segmentsB: string[]
): Array<{ text: string; start: number; end: number }> {
    const temps: Array<{ text: string; start: number; end: number }> = [];
    const results: Array<{ text: string; start: number; end: number }> = [];

    // `segment` が `original` 内に複数回出現する場合も含めて全て取得する
    const collectPositions = (segment: string) => {
        let index = 0;
        while (true) {
            const foundIndex = original.indexOf(segment, index);
            if (foundIndex === -1) {
                break;
            }
            temps.push({
                text: segment,
                start: foundIndex,
                end: foundIndex + segment.length
            });
            index = foundIndex + 1;
        }
    };

    // TinySegmenterの結果 + Kuromojiの結果 をそれぞれ走査
    segmentsA.forEach((seg) => collectPositions(seg));
    segmentsB.forEach((seg) => collectPositions(seg));

    // 同じ開始位置＋同じテキストの重複を排除する
    const uniqueMap = new Map<string, { text: string; start: number; end: number }>();
    for (const t of temps) {
        const key = `${t.text}@${t.start}`;
        if (!uniqueMap.has(key)) {
            uniqueMap.set(key, t);
        }
    }

    // start が小さい順、同じ start なら text が長い順に並べる
    const mergedSegments = Array.from(uniqueMap.values());
    mergedSegments.sort((a, b) => {
        if (a.start === b.start) {
            return b.text.length - a.text.length;
        }
        return a.start - b.start;
    });

    // マージされたセグメントから、重複のある要素のうち短い要素を取り除く
    let currentIndex = 0;
    for (const segment of mergedSegments) {
        if (segment.start >= currentIndex) {
            results.push(segment);
            currentIndex = segment.end;
        }
    }

    return results;
}

const report: TextlintRuleReporter<Options> = (context, options = {}) => {
    const allowAlphabet = options.allowAlphabet ?? DefaultOptions.allowAlphabet;
    const allowNumber = options.allowNumber ?? DefaultOptions.allowNumber;
    const allowLexeme = options.allowLexeme ?? DefaultOptions.allowLexeme;
    const allows = options.allows ?? DefaultOptions.allows;

    const { Syntax, getSource, RuleError, fixer } = context;
    const usedSudachiSynonyms: Set<SudachiSynonyms> = new Set();
    const usedItemGroup: Set<ItemGroup> = new Set();
    const locationMap: Map<SudachiSynonyms, number[]> = new Map();

    const indexPromise = createIndex({ allowLexeme });

    // テキスト中の単語を辞書と照合し、該当する ItemGroup があれば記録する
    const matchSegment = (segmentText: string, startIndex: number, keyItemGroupMap: Map<Midashi, ItemGroup[]>) => {
        const itemGroups = keyItemGroupMap.get(segmentText);
        if (!itemGroups) {
            return;
        }
        // 該当する全ItemGroupを調べる
        for (const itemGroup of itemGroups) {
            let recorded = false;
            for (const item of itemGroup.items) {
                if (item.midashi === segmentText) {
                    // 同じ単語については1グループ中で最初の一回だけ usedSudachiSynonyms に登録
                    if (!recorded) {
                        usedSudachiSynonyms.add(item);
                        recorded = true;
                    }
                    // 出現位置を記録
                    if (!locationMap.has(item)) {
                        locationMap.set(item, []);
                    }
                    locationMap.get(item)!.push(startIndex);
                }
            }
            usedItemGroup.add(itemGroup);
        }
    };

    return wrapReportHandler(
        context,
        {
            ignoreNodeTypes: [
                Syntax.BlockQuote,
                Syntax.CodeBlock,
                Syntax.Code,
                Syntax.Html,
                Syntax.Link,
                Syntax.Image,
                Syntax.Comment
            ]
        },
        (report) => {
            return {
                async [Syntax.Str](node) {
                    const text = getSource(node);

                    // TinySegmenter & kuromoji それぞれで分割
                    const tinyTokens = segmenter.segment(text);
                    const kuromojiTokens = await tokenize(text);
                    const kuromojiSegments = kuromojiTokens.map((token) => token.surface_form);

                    // 両方の結果をマージ
                    const mergedSegments = mergeSegments(text, tinyTokens, kuromojiSegments);

                    // マージした各セグメントを辞書と照合
                    const { keyItemGroupMap } = await indexPromise;
                    for (const seg of mergedSegments) {
                        // node の先頭位置 + seg.start で文章全体からの絶対位置を算出
                        const absoluteIndex = node.range[0] + seg.start;
                        matchSegment(seg.text, absoluteIndex, keyItemGroupMap);
                    }
                },
                async [Syntax.DocumentExit](node) {
                    await tokenize(getSource(node));
                    await indexPromise;

                    // 収集した ItemGroup それぞれに対し、実際に “使われた” items を洗い出し報告
                    for (const itemGroup of usedItemGroup.values()) {
                        // ItemGroup 側の usedItems() では、allowAlphabet/allowNumber/allows 等の条件を見ながら
                        // 「この item は実際に報告対象にするかどうか」を決めて返してくれる
                        const items = itemGroup.usedItems(usedSudachiSynonyms, {
                            allowAlphabet,
                            allowNumber,
                            allows
                        });

                        if (items.length >= 2) {
                            const midashiList = items.map((item) => item.midashi);
                            // 全登場単語をすべて報告する
                            for (let i = 0; i < items.length; i++) {
                                const item = items[i];
                                const deniedWord = item.midashi;
                                const indices = locationMap.get(item) || [];
                                const message = `同義語である「${midashiList.join("」と「")}」が利用されています`;

                                for (const idx of indices) {
                                    report(
                                        node,
                                        new RuleError(message, {
                                            index: idx,
                                            fix:
                                                i === 0
                                                    ? {
                                                          // 先頭アイテム(例: midashiList[0])に統一
                                                          text: deniedWord,
                                                          range: [idx, idx + deniedWord.length],
                                                          isAbsolute: false
                                                      }
                                                    : fixer.replaceTextRange(
                                                          [idx, idx + deniedWord.length],
                                                          midashiList[0]
                                                      )
                                        })
                                    );
                                }
                            }
                        }
                    }
                }
            };
        }
    );
};

export default {
    linter: report,
    fixer: report
};
