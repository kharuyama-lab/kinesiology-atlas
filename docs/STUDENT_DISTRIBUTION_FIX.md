# 学生へのリンク配布準備: 0.2.0-beta.1

2026-11-04。ユーザーが988a497の教材表示・中間筋走行を採用し、FIXへ進めることを確認した。独自コードの一般的な再利用許諾は追加しない。配布方法はユーザー選択の「リンク共有＋検索除外」。認証での閲覧制限は付けず、URLを知る人が閲覧できる方式。

## UIと入口

PCのヘッダーを左パネルの列に限定し、3D領域は画面上端まで使う。タブレット幅も同様。スマートフォンは従来のコンパクトな上部ヘッダーを維持する。承認済みロゴ・文字階層とMode→Focusの順序は維持。Creditsは左下から別タブで開き、教材状態を保持する。

通常URLの膝中心・軸は、これまで確認していたreview=muscles&axis=condyleと同じ顆部推定設定へ統一した。従来設定は開発比較用のaxis=legacyに限って残す。採用済みの筋・靭帯の走行式は変更しない。技術的な試作ラベルは通常のJoint Kinesiology表示へ整理した。

## ライセンスと配布範囲

LICENSE.md / TERMS_OF_USE.mdで、独自部分の学習・授業利用と再利用許諾を分ける。第三者の既存ライセンスは制限しない。BodyParts3D / Z-Anatomyの指定表記をcredits.htmlとCREDITS_AND_LICENSES.mdへ掲載した。上流のLICENSE / NOTICE / モデルLicense.txtを確認時のコミットから原文で保存。Three.js MIT、Draco Apache-2.0、OpenSim Apache-2.0と参考データCC BY 3.0の出典・変更・適用範囲を保持。

公開アプリが取得するのはskeletal / joints / muscularの3ファイルのみ。確認済みのローカルGLBと現上流の同ファイルは3件ともSHA-256一致。上流コミット8ca3b7421bcfbe88b85859eb1983d5cf79f21749に固定し、読み込み時にサイズ・SHA-256を照合する。GLBはGit/ZIPに新たに同梱しない。来歴はRELEASE_ASSET_PROVENANCE.json。

## 検索と通信

index.html / credits.htmlにnoindex, nofollow, noarchiveを設定。検索除外は認証ではなく、対応しない検索エンジンや既存の検索結果の即時消去を保証しない。meta noindexを読ませるためHTMLをrobots.txtで遮断しない。独立したアクセス解析・広告・登録機能はない。モデル取得時の配信元通信とホストのログはCreditsへ記載。外部リンク・モデル通信への参照元送信はno-referrerで抑える。

_config.ymlでlegacy / tests / docs / scriptsなど開発参照物をPages配信から除外する。src / config / vendorは実行に必要で、公開される。GitHubリポジトリ自体の公開設定はページの検索除外とは別であり、現状public。

## 検査

構文チェック・単体41件成功。実GLBのブラウザ8件成功：中間筋走行と実Auto、5幅ヘッダー、Hip一括、再生2件、通常入口/クレジット/検索除外、ローカルキャッシュを遮断した初回モデル取得、Hip/Knee共有UI。クレジットの全ローカルリンクをHTTP 200で確認。通常入口と確認済み設定の一致、モデル3件のハッシュ一致、ページ再描画とカメラ/Focus/表示状態の保持を確認。

## 配布物と公開操作

npm run build:studentで実行ファイル・ブランド資産・必要なライセンスだけをdist/student-siteへ作る。ZIPのルートにindex.htmlを置き、余計な親フォルダーや開発キャッシュ・Git・node_modules・GLB・旧Hipを入れない。現行バージョンとモデル版はrelease.jsonに記録。

現在のPagesはmainブランチのルートから公開される。公開反映は最終確認後に行い、反映後はHTTPSの通常URL・Credits・モデル読み込み・検索除外を新しいブラウザで確認する。Hip/Brainの別リポジトリ・サイトへの変更は行わない。

今回のFIXはユーザーが採用した教材表示の保全であり、完全な生体接触・張力・全三角形干渉の検証済み宣言ではない。過去からの全筋検査の半腱様筋方向変化の条件は別の既知課題として保持し、閾値変更やスキップはしない。

参照：
- https://raw.githubusercontent.com/nqwrc/3d-anatomy/8ca3b7421bcfbe88b85859eb1983d5cf79f21749/NOTICE
- https://developers.google.com/search/docs/crawling-indexing/block-indexing
- https://docs.github.com/en/enterprise-cloud@latest/pages/getting-started-with-github-pages/changing-the-visibility-of-your-github-pages-site

配信物単体を/kinesiology-atlas/のサブパスで起動する検査も成功。キャッシュなしで3モデルのハッシュが一致し、Credits・各原文ライセンス・アイコン・manifestは200、旧Hip・テスト・履歴docs・package.jsonは404。詳細はSTAGED_SITE_VERIFICATION.json。配信設定変更やmainマージは最終確認待ち。
