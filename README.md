# ATLASCEND — Kinesiology (BETA)

On the Shoulders of Giants. Beyond the Atlas.

学生の学習・授業での教育利用のための3D教材です。v0.2.0-beta.1は、ユーザー確認済みの中間筋走行・操作・表示をFIXした配布版です。モデルの動態は教育用の可視化であり、実測筋力や組織ひずみの計算ではありません。

## 配布と利用方針

配布されたURLをHTTPS対応のブラウザで開いて使います。ページには検索除外を設定していますが、認証による閲覧制限はありません。URLを知る人はアクセスできます。授業外への共有は控えてください。リポジトリの公開範囲とページの検索除外は別の設定です。

独自プログラム・教材・ブランドに一般的な再利用許諾は追加しません。[利用方針](TERMS_OF_USE.md)・[権利の区分](LICENSE.md)・[クレジット](CREDITS_AND_LICENSES.md)を参照してください。第三者素材の元ライセンスに基づく権利は制限しません。

## 操作

Mode 1はAnatomy、Mode 2はJoint Kinesiology。FocusはWhole Body / Hip / Knee。モード切替でカメラ・Focus・組織表示を維持し、Whole Bodyは意図的なホーム操作です。組織表示はON / Fade / OFF。Hip/Kneeの一括表示、個別表示、フローティング操作を同期します。Autoで選択した関節運動を往復します。

ヘッダーは左のパネル列に収め、PCの3D領域は画面上端まで使用します。クレジットは左下のCreditsから別タブで開きます。

## モデルと通信

使用するモデルはskeletal / joints / muscularの3ファイルのみ。確認済みの上流コミットとSHA-256を[config/model-assets.js](config/model-assets.js)に固定し、読み込み時に検証します。GLBはリポジトリ・配布ZIPに同梱せず外部配信元から取得します。最初の読み込みにはインターネット接続が必要です。Three.jsとDracoは同梱しています。教材自体に広告・アクセス解析・入力情報の送信機能はありません。

## ローカル起動

Node.jsを用意し、フォルダー内で npm run serve を実行して http://127.0.0.1:8080/ を開きます。ファイルを直接開く形式ではありません。保存済みの.cache内GLBがある場合も同じハッシュで検証します。

## 検証・保全

npm ci → npm run check → npm test。実モデルのブラウザ検証はWindows EdgeとPlaywrightを使用します。配布版の準備と検証は[STUDENT_DISTRIBUTION_FIX](docs/STUDENT_DISTRIBUTION_FIX.md)を参照してください。過去の試作記録はdocs内の履歴であり、現在の操作説明ではありません。

今回のFIXは確認済み教材表示の保全を意味し、生体接触・張力解析の認証ではありません。以前からの全筋短縮検査の半腱様筋の方向変化条件は別途の既知課題として残しています。承認済み筋走行の再変更は行いません。

既存のhip-kinesiologyおよびatlascend-brainのサイト・リポジトリは変更しません。legacy/hipは参照用で、学生用Pages配信から除外しています。
