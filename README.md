# Interactive 3D Kinesiology Atlas — Foundation / Knee v0.1

膝関節運動学の**検証用プロトタイプ**。既存のHip公開ページは変更しません。

## 起動
ZIP解凍後、フォルダ全体を新しいGitHubリポジトリ `kinesiology-atlas` にアップロードし、GitHub Pagesをmain/(root)で公開します。
ローカル確認はフォルダ内で `python -m http.server 8080` を起動し `http://localhost:8080/` にアクセス。`file://` での直接起動は避けてください。
3Dモデルはオンライン取得（Z-Anatomy派生モデルのGLB）。通信環境が制限される場合は教材画面の診断欄からGLBを手動読み込みできます。

## 学習画面
- Mode 1：全身静止解剖。全身→右膝へフォーカス、右膝主要筋とACL/PCL/MCL/LCL・内外側半月板の表示。モデル上の組織をクリックして名前や表示を切替。
- Mode 2：膝屈伸、屈曲位の下腿内外旋、軽度内外反。骨格運動は**校正前の試作**。正式授業配布前に大腿骨と脛骨の解剖学的整合を確認。
- Hip 完成版：`legacy/hip/index.html`を独立して表示。

## 次期開発（今回は実装しない）
- 膝動態：靭帯の変形・線維束ごとの緊張、半月板・膝蓋骨の連動軌道。
- Mode 1：Z-Anatomy 3Dメッシュの水平断面。
- Mode 3：二関節筋限定表示、股・膝等の個別角度と筋腱長変化。
- CKC / reverse action。

詳しくは `docs/ARCHITECTURE.md` と `docs/RELEASE_AND_QC.md` を参照してください。

## データ・出典
3Dモデル：Z-Anatomy/BodyParts3D由来、`nqwrc/3d-anatomy` 公開GLBを使用。アセットは本ZIPに同梱していません。ライセンス等は`CREDITS_AND_LICENSES.md`を参照してください。
