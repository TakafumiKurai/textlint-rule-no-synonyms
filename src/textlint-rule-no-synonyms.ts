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
     * 使用を許可する見出し語の配列
     * 定義された見出し語以外の同義語をエラーにします
     * 例) ["ユーザー"] // => 「ユーザー」だけ許可し「ユーザ」などはエラーにする
     */
    preferWords?: string[];
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
    preferWords: [],
    allowAlphabet: true,
    allowNumber: true,
    allowLexeme: true
};

function mergeSegments(original: string, segmentA: string[], segmentB: string[]): string[] {
    const result: string[] = [];

    // セグメントの情報を作成し、元の文字列内での位置をトラッキング
    function findNextIndex(segment: string, usedIndices: Set<number>): { start: number; end: number } | null {
        let startIndex = original.indexOf(segment);
        while (startIndex !== -1) {
            if (!usedIndices.has(startIndex)) {
                usedIndices.add(startIndex);
                return { start: startIndex, end: startIndex + segment.length };
            }
            startIndex = original.indexOf(segment, startIndex + 1);
        }
        return null;
    }

    // 2つのsegment配列を、オリジナルの文字列の開始と終了のインデックスを持つ1つの配列に結合する。
    const usedIndicesA: Set<number> = new Set();
    const usedIndicesB: Set<number> = new Set();
    const segments = [
        ...segmentA
            .map((seg) => ({ text: seg, ...findNextIndex(seg, usedIndicesA) }))
            .filter((seg) => seg.start !== undefined),
        ...segmentB
            .map((seg) => ({ text: seg, ...findNextIndex(seg, usedIndicesB) }))
            .filter((seg) => seg.start !== undefined)
    ].filter((seg): seg is { text: string; start: number; end: number } => seg !== null);

    // segmentsを開始位置でソートし、等しい場合は長さの降順でソートする。
    segments.sort((a, b) => a.start - b.start || b.text.length - a.text.length);

    let currentIndex = 0;
    for (const segment of segments) {
        // segmentのstartが現在のcurrentIndex以上であれば、resultに追加する
        if (segment.start >= currentIndex) {
            result.push(segment.text);
            currentIndex = segment.end;
        }
    }

    return result;
}

const report: TextlintRuleReporter<Options> = (context, options = {}) => {
    const allowAlphabet = options.allowAlphabet ?? DefaultOptions.allowAlphabet;
    const allowNumber = options.allowNumber ?? DefaultOptions.allowNumber;
    const allowLexeme = options.allowLexeme ?? DefaultOptions.allowLexeme;
    const allows = options.allows !== undefined ? options.allows : DefaultOptions.allows;
    const preferWords = options.preferWords !== undefined ? options.preferWords : DefaultOptions.preferWords;
    const { Syntax, getSource, RuleError, fixer } = context;
    const usedSudachiSynonyms: Set<SudachiSynonyms> = new Set();
    const locationMap: Map<SudachiSynonyms, { index: number }> = new Map();
    const usedItemGroup: Set<ItemGroup> = new Set();
    const indexPromise = createIndex({ allowLexeme });
    const matchSegment = (segment: string, absoluteIndex: number, keyItemGroupMap: Map<Midashi, ItemGroup[]>) => {
        const itemGroups = keyItemGroupMap.get(segment);
        if (!itemGroups) {
            return;
        }
        itemGroups.forEach((itemGroup) => {
            // "アーカイブ" など同じ見出しを複数回もつItemGroupがあるため、ItemGroupごとに1度のみに限定
            let midashAtOnce = false;
            itemGroup.items.forEach((item) => {
                if (!midashAtOnce && item.midashi === segment) {
                    midashAtOnce = true;
                    usedSudachiSynonyms.add(item);
                    locationMap.set(item, { index: absoluteIndex });
                }
                usedItemGroup.add(itemGroup);
            });
        });
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
                    const tinySegments: string[] = segmenter.segment(text);
                    const kuromojiSegments = (await tokenize(text)).map((e) => e.surface_form);
                    const segments = mergeSegments(text, tinySegments, kuromojiSegments);

                    let absoluteIndex = node.range[0];
                    const { keyItemGroupMap } = await indexPromise;
                    segments.forEach((segement) => {
                        matchSegment(segement, absoluteIndex, keyItemGroupMap);
                        absoluteIndex += segement.length;
                    });
                },
                async [Syntax.DocumentExit](node) {
                    const text = getSource(node);
                    await tokenize(text);
                    await indexPromise;
                    for (const itemGroup of usedItemGroup.values()) {
                        const items = itemGroup.usedItems(usedSudachiSynonyms, {
                            allows,
                            allowAlphabet,
                            allowNumber
                        });
                        const preferWord = preferWords.find((midashi) => itemGroup.getItem(midashi));
                        const allowed = allows.find((midashi) => itemGroup.getItem(midashi));
                        if (preferWord && !allowed) {
                            const deniedItems = items.filter((item) => item.midashi !== preferWord);
                            for (const item of deniedItems) {
                                const index = locationMap.get(item)?.index ?? 0;
                                const deniedWord = item.midashi;
                                const message = `「${preferWord}」の同義語である「${deniedWord}」が利用されています`;
                                report(
                                    node,
                                    new RuleError(message, {
                                        index,
                                        fix: fixer.replaceTextRange([index, index + deniedWord.length], preferWord)
                                    })
                                );
                            }
                        } else if (items.length >= 2) {
                            const midashiList = items.map((item) => item.midashi);
                            items.forEach((item, itemIdx) => {
                                const index = locationMap.get(item)?.index ?? 0;
                                const deniedWord = item.midashi;
                                const message = `同義語である「${midashiList.join("」と「")}」が利用されています`;
                                report(
                                    node,
                                    new RuleError(message, {
                                        index,
                                        fix:
                                            itemIdx === 0
                                                ? {
                                                      text: deniedWord,
                                                      range: [index, index + deniedWord.length],
                                                      isAbsolute: false
                                                  }
                                                : fixer.replaceTextRange(
                                                      [index, index + deniedWord.length],
                                                      midashiList[0]
                                                  )
                                    })
                                );
                            });
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
