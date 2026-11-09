# 足関節・足部の元データ確認（2026-11-09）

## 結論と前回答の訂正

使用中の固定GLBを変形せずに読み込み、右足部の靭帯・関節包を40オブジェクト確認した。jointsに39、muscularに浅横中足靭帯が1ある。関節包4を含むので、40本の独立した靭帯という意味ではない。複数の靭帯をまとめたメッシュもある。本体で運動追従へ登録したのは16オブジェクトであり、元データ全体を表す一覧ではなかった。

前距腓・踵腓・後距腓靭帯は、名称に一致する独立オブジェクトも、外側側副靭帯という親グループも確認できていない。ただし結合メッシュの一部分が当該構造かどうかを完全に同定できてはいない。「名称がない→形状が存在しない」とした前回答は不適切だった。「この固定GLB内で対応形状を未同定」が現在の結論であり、Z-Anatomyの元Blender全体にないという結論ではない。

## 再現方法

[元形状を切り替えるローカル確認画面](http://127.0.0.1:8080/ankle-source-review.html)。このページは本体から独立した監査用で、本体の付着部補正・再構成・変形は適用しない。各名称を押すと当該メッシュのみ表示できる。色は識別用で、緊張を表さない。

3ファイルの全構造の親・形状範囲は FOOT_SOURCE_INVENTORY.json に保存。右側かつ全形状が高さ0.16m未満の空間条件で足部候補を抽出した。これは元データにある正式な部位分類ではない。長い下腿筋・腱の全長はこの空間条件から外れるが、それらも全構造一覧には記録している。

## 元データの全一覧

「追従対象」は本体のAnkleに登録しているという意味。対象外は不存在を意味せず、監査画面では全て表示できる。足趾の運動を省略する合意もあり、対象外をすべて実装漏れとは扱わない。元の英語名をそのまま記載。

| # | 元名称（右側） | ファイル | 本体の運動追従 |
|---|---|---|---|
| 1 | Anterior tibiofibular ligament.r | joints | 対象 |
| 2 | Posterior tibiofibular ligament.r | joints | 対象 |
| 3 | Transverse tibiofibular ligament.r | joints | 対象 |
| 4 | Posterior tibiotalar ligament.r | joints | 対象 |
| 5 | Tibiocalcaneal ligament.r | joints | 対象 |
| 6 | Tibionavicular ligament.r | joints | 対象 |
| 7 | Dorsal metatarsal ligaments.r | joints | 対象外 |
| 8 | Intersesamoid ligament.r | joints | 対象外 |
| 9 | Metatarsal interosseous ligaments.r | joints | 対象外 |
| 10 | Plantar metatarsal ligaments.r | joints | 対象外 |
| 11 | Articular capsule of interphalangeal joint of great toe.r | joints | 対象外 |
| 12 | Articular capsules of distal interphalangeal joints of foot.r | joints | 対象外 |
| 13 | Articular capsules of proximal interphalangeal joints of foot.r | joints | 対象外 |
| 14 | Collateral interphalangeal ligaments of foot.r | joints | 対象外 |
| 15 | Plantar interphalangeal ligaments.r | joints | 対象外 |
| 16 | Anterior talocalcaneal ligament.r | joints | 対象 |
| 17 | Calcaneocuboid ligament.r | joints | 対象 |
| 18 | Calcaneonavicular ligament.r | joints | 対象 |
| 19 | Cuneocuboid interosseous ligament.r | joints | 対象外 |
| 20 | Dorsal cuneonavicular ligaments.r | joints | 対象外 |
| 21 | Dorsal intercuneiform ligaments.r | joints | 対象外 |
| 22 | Intercuneiform interosseous ligaments.r | joints | 対象外 |
| 23 | Lateral talocalcaneal ligament.r | joints | 対象 |
| 24 | Long plantar ligament.r | joints | 対象 |
| 25 | Medial talocalcaneal ligament.r | joints | 対象 |
| 26 | Plantar calcaneocuboid ligament.r | joints | 対象 |
| 27 | Plantar cuneocuboid ligament.r | joints | 対象外 |
| 28 | Plantar cuneonavicular ligaments.r | joints | 対象外 |
| 29 | Plantar intercuneiform ligaments.r | joints | 対象外 |
| 30 | Posterior talocalcaneal ligament.r | joints | 対象 |
| 31 | Talocalcaneal interosseous ligament.r | joints | 対象 |
| 32 | Talonavicular ligament.r | joints | 対象 |
| 33 | Articular capsules of metatarsophalangeal joints.r | joints | 対象外 |
| 34 | Collateral metatarsophalangeal ligaments.r | joints | 対象外 |
| 35 | Deep transverse metatarsal ligament.r | joints | 対象外 |
| 36 | Plantar metatarsophalangeal ligaments.r | joints | 対象外 |
| 37 | Cuneometatarsal interosseous ligaments.r | joints | 対象外 |
| 38 | Dorsal tarsometatarsal ligaments.r | joints | 対象外 |
| 39 | Plantar tarsometatarsal ligaments.r | joints | 対象外 |
| 40 | Superficial transverse metatarsal ligament.r | muscular | 対象外 |

## 別名・クラスターの照合

- 40候補の親はGLTF読み込み後はいずれもSceneで、外側側副靭帯の親オブジェクトは見つからなかった。元のGLBの足部ノードも個別メッシュとして並んでいる。元BlenderにあるコレクションがGLBに出力されたとは限らない。
- Fibular collateral ligament.r はあるが、形状の高さ範囲は約0.407–0.460mで膝の位置にある。足関節の踵腓靭帯の別名とは扱えない。
- Lateral talocalcaneal ligament.r は元の頂点で見ると距骨・踵骨に近い。長軸両端12%の平均表面距離は、一端が踵骨約0.24mm、他端が距骨約0.24mm。腓骨への距離は約14.4mmと7.0mmであり、これをそのまま踵腓靭帯と読み替える根拠はない。計測は同定の補助にすぎず、正式な付着点計測ではない。
- 前・後脛腓靭帯と横脛腓靭帯は腓骨に近い形状を持つが、名称と反対側の端の位置は脛骨との連結を支持する。これらを前・後距腓靭帯に置換してはいけない。
- 同じ公開版の systems.json と lexicon.json でも talofibular / calcaneofibular の文字列を確認できなかった。これは公開GLB側での未同定を補強するが、元Blender全体の不存在の証明にはならない。

## 公開元と利用条件

- [利用中の公開派生モデル](https://github.com/nqwrc/3d-anatomy)
- [固定した版のjoints.glb](https://github.com/nqwrc/3d-anatomy/blob/8ca3b7421bcfbe88b85859eb1983d5cf79f21749/public/models/joints.glb)
- [固定版の構造一覧](https://raw.githubusercontent.com/nqwrc/3d-anatomy/8ca3b7421bcfbe88b85859eb1983d5cf79f21749/public/data/systems.json)
- [固定版のライセンス原文](https://raw.githubusercontent.com/nqwrc/3d-anatomy/8ca3b7421bcfbe88b85859eb1983d5cf79f21749/public/models/License.txt)
- [Z-Anatomy（元アトラス）](https://www.z-anatomy.com/)
- [BodyParts3D（基礎データ）](https://lifesciencedb.jp/bp3d/)

BodyParts3DはCC BY-SA 2.1 Japan、Z-AnatomyはCC BY-SA 4.0として出典に記載されている。派生公開リポジトリのREADMEは、全体配布に非商用の内耳・腎臓素材も含まれることを明記している。全データを一律の無条件利用素材とは扱わず、原文のLICENSE/NOTICE/License.txtを参照する。今回、モデルの再配布・公開版の更新はしていない。
