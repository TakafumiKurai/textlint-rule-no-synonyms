import TextLintTester from "textlint-tester";

const tester = new TextLintTester();
// rule
import rule from "../src/textlint-rule-no-synonyms";
// ruleName, rule, { valid, invalid }
tester.run("textlint-rule-no-synonyms", rule, {
    valid: [
        "新参入、借り入れ、問題のパスポート、マネー、雇入 片方のペアだけならOKです",
        "インターフェースとインターフェースは同じなのでOK",
        "This is アーカイブ",
        // allowAlphabet: true
        // item.hyoukiYure === "アルファベット表記"
        "blogはブログです",
        // allowNumber: true
        "1は数字の一種です",
        // item.ryakusyou === "略語・略称/アルファベット"
        "「データベース」「DB」",
        // allow links by default
        `「[インターフェース](https://example.com)」と「[インタフェース](https://example.com)」`,
        // "allows
        {
            text: `ウェブアプリとウェブアプリケーションの違いは許容する`,
            options: {
                allows: ["ウェブアプリ"] // <= 片方が許可されていればOK
            }
        },
        // allowLexeme
        {
            text: "部屋の同義語はルームです",
            options: {
                allowLexeme: true
            }
        },
        {
            text: "部屋の英語はroomです",
            options: {
                allowLexeme: false,
                allowAlphabet: true
            }
        },
        {
            text: "部屋の英語はroomです",
            options: {
                allowLexeme: false,
                allowAlphabet: false,
                allows: ["部屋"] // <= 片方が許可されていればOK
            }
        }
    ],
    invalid: [
        {
            text: "問い合わせと問合せ",
            errors: [
                {
                    message: "同義語である「問い合わせ」と「問合せ」が利用されています",
                    index: 0
                },
                {
                    type: "lint",
                    ruleId: "textlint-rule-no-synonyms",
                    message: "同義語である「問い合わせ」と「問合せ」が利用されています",
                    index: 6,
                    line: 1,
                    column: 7,
                    severity: 2,
                    fix: {
                        range: [6, 9],
                        text: "問い合わせ"
                    }
                }
            ]
        },
        {
            text: "サーバとサーバーの表記揺れがある",
            errors: [
                {
                    message: "同義語である「サーバ」と「サーバー」が利用されています",
                    index: 0
                },
                {
                    type: "lint",
                    ruleId: "textlint-rule-no-synonyms",
                    message: "同義語である「サーバ」と「サーバー」が利用されています",
                    index: 4,
                    line: 1,
                    column: 5,
                    severity: 2,
                    fix: {
                        range: [4, 8],
                        text: "サーバ"
                    }
                }
            ]
        },
        {
            text: "この雇入と雇入れの違いは難しい問題だ",
            errors: [
                {
                    message: "同義語である「雇入」と「雇入れ」が利用されています",
                    index: 2
                },
                {
                    type: "lint",
                    ruleId: "textlint-rule-no-synonyms",
                    message: "同義語である「雇入」と「雇入れ」が利用されています",
                    index: 5,
                    line: 1,
                    column: 6,
                    severity: 2,
                    fix: {
                        range: [5, 8],
                        text: "雇入"
                    }
                }
            ]
        },
        {
            text: "blogはブログです",
            options: {
                allowAlphabet: false
            },
            errors: [
                {
                    message: "同義語である「blog」と「ブログ」が利用されています",
                    index: 0
                },
                {
                    type: "lint",
                    ruleId: "textlint-rule-no-synonyms",
                    message: "同義語である「blog」と「ブログ」が利用されています",
                    index: 5,
                    line: 1,
                    column: 6,
                    severity: 2,
                    fix: {
                        range: [5, 8],
                        text: "blog"
                    }
                }
            ]
        },
        {
            text: "1は数字の一種です",
            options: {
                allowNumber: false
            },
            errors: [
                {
                    message: "同義語である「1」と「一」が利用されています",
                    index: 0
                },
                {
                    type: "lint",
                    ruleId: "textlint-rule-no-synonyms",
                    message: "同義語である「1」と「一」が利用されています",
                    index: 5,
                    line: 1,
                    column: 6,
                    severity: 2,
                    fix: {
                        range: [5, 6],
                        text: "1"
                    }
                }
            ]
        },
        {
            text: "部屋のカタカナ英語はルームです",
            options: {
                allowLexeme: false
            },
            errors: [
                {
                    message: "同義語である「部屋」と「ルーム」が利用されています",
                    index: 0
                },
                {
                    type: "lint",
                    ruleId: "textlint-rule-no-synonyms",
                    message: "同義語である「部屋」と「ルーム」が利用されています",
                    index: 10,
                    line: 1,
                    column: 11,
                    severity: 2,
                    fix: {
                        range: [10, 13],
                        text: "部屋"
                    }
                }
            ]
        },
        {
            text: "部屋の英語はroomです",
            options: {
                allowAlphabet: false,
                allowLexeme: false
            },
            errors: [
                {
                    message: "同義語である「部屋」と「room」が利用されています",
                    index: 0
                },
                {
                    type: "lint",
                    ruleId: "textlint-rule-no-synonyms",
                    message: "同義語である「部屋」と「room」が利用されています",
                    index: 6,
                    line: 1,
                    column: 7,
                    severity: 2,
                    fix: {
                        range: [6, 10],
                        text: "部屋"
                    }
                }
            ]
        },
        {
            text: "ユーザーはだめでユーザはエラー。allowAlphabetがtrueならuserはエラーにならない",
            errors: [
                {
                    index: 0
                },
                {
                    index: 8
                }
            ]
        },
        {
            text: "ユーザーはだめでallowAlphabetがfalseならユーザもuserもエラー",
            options: {
                allowAlphabet: false
            },
            errors: [
                {
                    index: 0
                },
                {
                    index: 29
                },
                {
                    index: 33
                }
            ]
        },
        {
            text: "ルームは許可しallowLexemeがfalseなら部屋もエラー",
            options: {
                allowLexeme: false
            },
            errors: [
                {
                    index: 0
                },
                {
                    index: 26
                }
            ]
        },
        {
            text: "サーバとサーバーの表記揺れがある。この雇入と雇入れの違いは難しい問題だ。",
            output: "サーバとサーバの表記揺れがある。この雇入と雇入の違いは難しい問題だ。",
            errors: [
                {
                    message: "同義語である「サーバ」と「サーバー」が利用されています",
                    index: 0
                },
                {
                    type: "lint",
                    ruleId: "textlint-rule-no-synonyms",
                    message: "同義語である「サーバ」と「サーバー」が利用されています",
                    index: 4,
                    line: 1,
                    column: 5,
                    severity: 2,
                    fix: {
                        range: [4, 8],
                        text: "サーバ"
                    }
                },
                {
                    message: "同義語である「雇入」と「雇入れ」が利用されています",
                    index: 19
                },
                {
                    type: "lint",
                    ruleId: "textlint-rule-no-synonyms",
                    message: "同義語である「雇入」と「雇入れ」が利用されています",
                    index: 22,
                    line: 1,
                    column: 23,
                    severity: 2,
                    fix: {
                        range: [22, 25],
                        text: "雇入"
                    }
                }
            ]
        },
        {
            text: "例えばサーバに関する問い合わせについて。\n問合せ対象のサーバーによって対応を分けることはありうるか",
            errors: [
                {
                    type: "lint",
                    ruleId: "textlint-rule-no-synonyms",
                    message: "同義語である「サーバ」と「サーバー」が利用されています",
                    index: 3,
                    line: 1,
                    column: 4,
                    severity: 2,
                    fix: {
                        range: [3, 6],
                        text: "サーバ"
                    }
                },
                {
                    type: "lint",
                    ruleId: "textlint-rule-no-synonyms",
                    message: "同義語である「問い合わせ」と「問合せ」が利用されています",
                    index: 10,
                    line: 1,
                    column: 11,
                    severity: 2,
                    fix: {
                        range: [10, 15],
                        text: "問い合わせ"
                    }
                },
                {
                    type: "lint",
                    ruleId: "textlint-rule-no-synonyms",
                    message: "同義語である「問い合わせ」と「問合せ」が利用されています",
                    index: 21,
                    line: 2,
                    column: 1,
                    severity: 2,
                    fix: {
                        range: [21, 24],
                        text: "問い合わせ"
                    }
                },
                {
                    type: "lint",
                    ruleId: "textlint-rule-no-synonyms",
                    message: "同義語である「サーバ」と「サーバー」が利用されています",
                    index: 27,
                    line: 2,
                    column: 7,
                    severity: 2,
                    fix: {
                        range: [27, 31],
                        text: "サーバ"
                    }
                }
            ]
        },
        {
            text: "もしユーザーとユーザが両方あるなら。\nエンドユーザーとユーザーとユーザベースはどう？",
            options: {
                allowAlphabet: false,
                allowNumber: false
            },
            errors: [
                {
                    type: "lint",
                    ruleId: "textlint-rule-no-synonyms",
                    index: 2,
                    line: 1
                },
                {
                    type: "lint",
                    ruleId: "textlint-rule-no-synonyms",
                    index: 7,
                    line: 1
                },
                {
                    type: "lint",
                    ruleId: "textlint-rule-no-synonyms",
                    index: 27,
                    line: 2
                }
            ]
        }
    ]
});
