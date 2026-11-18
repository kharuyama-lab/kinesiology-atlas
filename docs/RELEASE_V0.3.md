# ATLASCEND Kinesiology v0.3.0-beta.1

2026-11-18。ユーザー確認済みAnkleを既存のHip／Kneeへ追加するリリース。

- 配布URLは https://kharuyama-lab.github.io/kinesiology-atlas/ のまま。
- FocusはWhole Body／Hip／Knee／Ankle。Ankleの骨・関節運動、靭帯・筋腱の追従、筋群選択、支帯の独立表示を統合。
- 足趾に独立した運動は追加しない。既存の足部内在筋は静的・受動的に表示。
- 検索除外、URL共有による閲覧、クレジットと既存の権利区分は維持。
- Hip／Kneeの承認済み運動を維持。別のHip／Brainリポジトリとsourcesは変更しない。
- 版番号とモジュールの読込URLを更新し、旧版のキャッシュとの混在を防ぐ。閲覧用のURL・配信先・Pagesのルート設定は変更しない。
- 独立した開発レビューHTMLはPagesの配信対象から除外。

## 検証

構文確認・62件の単体検査、既存リリース用ブラウザ検査に加え、Pagesと同じ `/kinesiology-atlas/` 配下の配布用フォルダーで以下を確認する。

- 新版の版番号、4つのFocus、Whole Bodyからの起動。
- Hip／Kneeの運動とAnkleの4運動。
- 圧縮頂点・法線データの取得・展開と支帯ワーカーの動作。
- 筋ON／支帯Fade、筋群の常時表示、日英併記。
- クレジットと検索除外。

記録は `STAGED_ANKLE_V0.3_VERIFICATION.json`。公開反映後は同じスクリプトの `--published` でHTTPS配信を確認し、`PUBLISHED_ANKLE_V0.3_VERIFICATION.json` に保存する。

従来の `PUBLISHED_SITE_VERIFICATION.json` とその画像は前回リリースの未コミット参照資料として保護し、上書きしない。

公開反映確認済み：2026-11-18。公開コミット `100ae48a41c3ee89516b55f4cdad84ac5d244e6b`。Pagesデプロイ成功、同じHTTPS URLでのブラウザ検証はPASS。公開検証記録と画像はローカルの検証コミットに保管する。
