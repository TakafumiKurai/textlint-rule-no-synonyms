### このレポジトリは本家のtextlint-rule-no-synonymsからforkしたレポジトリです。
[textlint-rule-no-synonyms](https://github.com/textlint-ja/textlint-rule-no-synonyms)をフォークしています。

基本的なライセンスはフォーク元のレポジトリに準拠します。

### 改変点
- 利用しているモジュールの「sudachi-synonyms-dictionary」を、最新（2024.11.13時点）のsudachi-synonyms-dictionayを参照するように更新した[「sudachi-synonyms-dictionary-kurai-forked-ver」](https://github.com/TakafumiKurai/sudachi-synonyms-dictionary)に置き換え
- segmenterとしてtiny-segmenterと同時にkuromojinを利用し、文章をより大きな粒度で分解するようにした（tiny-segmenterではsudachi-synonyms-dictionaryより細かい粒度で単語を分割してしまう場合があるため）

# @textlint-ja/textlint-rule-no-synonyms

文章中の同義語を表記ゆれをチェックするtextlintルールです。

同義語の辞書として[Sudachi 同義語辞書](https://github.com/WorksApplications/SudachiDict/blob/develop/docs/synonyms.md)を利用しています。

**NG**:

1つの文章中に同一語彙の別表記を利用している場合を表記ゆれとしてエラーにします。

```
サーバとサーバーの表記揺れがある。
この雇入と雇入れの違いを見つける。
```

## Install

Install with [npm](https://www.npmjs.com/):

    npm install @textlint-ja/textlint-rule-no-synonyms sudachi-synonyms-dictionary

辞書となる[sudachi-synonyms-dictionary](https://github.com/azu/sudachi-synonyms-dictionary)は[peerDependencies](https://npm.github.io/using-pkgs-docs/package-json/types/peerdependencies.html)なので、ルールとは別に辞書ファイルをインストールする必要があります。
ルール間で1つの辞書ファイルを共有するためです。

> Cannot find module 'sudachi-synonyms-dictionary'

上記のエラーが出ている場合は辞書ファイルである`sudachi-synonyms-dictionary`をインストールしてください

    npm install sudachi-synonyms-dictionary

## Usage

Via `.textlintrc`(Recommended)

```json
{
    "rules": {
        "@textlint-ja/no-synonyms": true
    }
}
```

Via CLI

```
textlint --rule @textlint-ja/no-synonyms README.md
```

## Options

```ts
{
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
```

**Example**:

```json
{
    "rules": {
        "@textlint-ja/no-synonyms": {
            "allows": ["ウェブアプリ", "ウェブアプリケーション"],
            "preferWords": ["ユーザー"],
            "allowAlphabet": false,
            "allowNumber": false,
            "allowLexeme": false
        }
    }
}
```

## References

- [Sudachi 同義語辞書](https://github.com/WorksApplications/SudachiDict/blob/develop/docs/synonyms.md)
- [azu/sudachi-synonyms-dictionary: Sudachi's synonyms dictionary](https://github.com/azu/sudachi-synonyms-dictionary)
- [azu/sudachi-synonyms-parser: Sudachi's synonyms dictionary parser](https://github.com/azu/sudachi-synonyms-parser)


## Changelog

See [Releases page](https://github.com/textlint-ja/textlint-rule-no-synonyms/releases).

## Running tests

Install devDependencies and Run `npm test`:

    npm test

## Contributing

Pull requests and stars are always welcome.

For bugs and feature requests, [please create an issue](https://github.com/textlint-ja/textlint-rule-no-synonyms/issues).

1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :D

## Author

- [github/azu](https://github.com/azu)
- [twitter/azu_re](https://twitter.com/azu_re)

## License

MIT © azu
