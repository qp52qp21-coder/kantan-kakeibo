# かんたん家計簿

双子のお子さん（別居）が自分でお金を管理するための、スマホ向け家計簿Webアプリ。
保護者（とみぃさん）は閲覧のみ。音声で入力できるのが最大の特徴。

このファイルは「同じアプリをゼロからもう一度作れる」ことを目的とした指示文書。
仕様・設計判断・Firebase側の設定まで、コードを読まなくても再現できるように書いてある。

## 技術構成

- 単一の `index.html` に HTML / CSS / JavaScript をすべて内包（フレームワーク・ビルド不要）
- データ保存は **Cloud Firestore**（端末をまたいで同期する必要があるため。localStorageではない）
- ログインは **Firebase Authentication**（メール／パスワード方式）
- PWA（`manifest.json` + `sw.js`）。ホーム画面に追加するとアプリ風に起動、オフラインでも開ける
- 外部ライブラリはすべてCDNから読み込み（npm・ビルド不要）
  - Firebase JS SDK 10.12.2（compat版: app / firestore / auth）
  - Chart.js 4.4.3（円グラフ・棒グラフ）
  - SheetJS(xlsx) 0.18.5（Excel出力）
- 想定端末は Android / Chrome。iPhone / Safari でも動作すること

## ファイル構成

```
index.html            アプリ本体（これ1つで全機能。約1,070行）
manifest.json         ホーム画面追加用の設定
sw.js                 Service Worker（オフライン対応・通知クリック処理）
icon-192.png          アイコン（192px / purpose: "any maskable"）
icon-512.png          アイコン（512px / purpose: "any maskable"）
```

## 公開先

- リポジトリ: https://github.com/qp52qp21-coder/kantan-kakeibo
- 公開URL: https://qp52qp21-coder.github.io/kantan-kakeibo/
- GitHub Pages（main ブランチ / root）で公開
- **これまでの更新はGitHubのWeb画面から「Add files via upload」でファイルを差し替える方法で行っている**
  （コミット履歴がすべて "Add files via upload" なのはこのため）。git push でも同じ結果になる

## Firebase側の設定（再現に必須）

現行プロジェクト: **family-kakeibo**（プロジェクトID `family-kakeibo-a23af` / Sparkプラン＝無料枠）

### 1. Authentication

- ログイン方法は「メール／パスワード」のみ有効にする
- ユーザーは3つ。アプリ側で自動作成される（初期設定画面で作られる）
  - `t1@kantan-kakeibo.local` … ふたご1人目
  - `t2@kantan-kakeibo.local` … ふたご2人目
  - `parent@kantan-kakeibo.local` … 保護者（閲覧のみ）
- **画面上は「名前を選ぶ＋4桁の暗証番号」だけ**。裏側でメールアドレスとパスワードに変換している

```js
function authEmail(uidKey){ return uidKey+'@kantan-kakeibo.local'; }
function authPassword(pin){ return pin+'-kk26'; } // Firebaseは6文字以上必須のため補完
```

### 2. Firestore のデータ構造

```
meta/users                  { authReady:true, t1:{name}, t2:{name}, parent:{name} }
users/{uid}                 { initSbi, initPaypay, initSuica, initMerpay, initCash, initOther, notifyTime }
users/{uid}/tx/{txId}       1件の記録（下記「データ構造」参照）
```

`{uid}` は `t1` / `t2` / `parent` の3種類のみ。

### 3. Firestore セキュリティルール（そのままコピーして使う）

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /meta/users {
      allow read: if true;
      allow create: if !exists(/databases/$(database)/documents/meta/users);
      allow update: if request.auth != null;
    }

    match /users/{uid} {
      allow read: if request.auth != null &&
        (request.auth.token.email == uid + '@kantan-kakeibo.local' ||
         request.auth.token.email == 'parent@kantan-kakeibo.local');
      allow write: if request.auth != null &&
        request.auth.token.email == uid + '@kantan-kakeibo.local';

      match /tx/{txId} {
        allow read: if request.auth != null &&
          (request.auth.token.email == uid + '@kantan-kakeibo.local' ||
           request.auth.token.email == 'parent@kantan-kakeibo.local');
        allow write: if request.auth != null &&
          request.auth.token.email == uid + '@kantan-kakeibo.local';
      }
    }
  }
}
```

要点は「**本人だけが書き込める。保護者は全員のデータを読めるが書けない**」。
`meta/users` の read が `true` なのは、ログイン画面に名前を出すために未ログイン状態で読む必要があるため。

### 4. index.html に埋め込むFirebase設定

```js
const firebaseConfig = {
  apiKey: "AIzaSyB3pIHA610hebs5_ALecSkZMnO7gdiAMZg",
  authDomain: "family-kakeibo-a23af.firebaseapp.com",
  projectId: "family-kakeibo-a23af",
  storageBucket: "family-kakeibo-a23af.firebasestorage.app",
  messagingSenderId: "777905574564",
  appId: "1:777905574564:web:6359c4b7d6254fbb714c31"
};
```

このapiKeyは秘密情報ではない（Web用のFirebase設定は公開前提で、安全性は上のセキュリティルールで担保する）。
新しいFirebaseプロジェクトで作り直す場合は、コンソールの「Webアプリを追加」で出てくる値に丸ごと差し替える。

## データ構造

```js
tx = {
  type,       // 'expense' | 'income' | 'transfer'
  amount,     // 数値（円）
  category,   // カテゴリー名。type:'transfer' のときは無し
  method,     // 支払い方法／受け取り先のID。type:'transfer' のときは無し
  from,       // 振替元。'sbi' 固定（type:'transfer' のときのみ）
  to,         // 振替先のID（type:'transfer' のときのみ）
  date,       // "YYYY-MM-DD"
  memo,       // メモ（任意）
  createdAt   // serverTimestamp()
}
```

カテゴリー・支払い方法は定数で持つ:

```js
const CATS_EXPENSE = ['食費','家賃','光熱費','通信費','交通費','交際費','趣味娯楽費','教材費','予備費'];
const CATS_INCOME  = ['仕送り','アルバイト','その他収入'];
// id と表示名。支出画面では「SBIデビット」、収入・振替画面では「SBIネット銀行」と呼び分ける
const METHODS  = [sbi:'SBIデビット', paypay, suica, merpay, cash, other];
const ACCOUNTS = [sbi:'SBIネット銀行', paypay, suica, merpay, cash, other];
```

残高は保存せず、**設定画面の初期残高（`initXxx`）に全取引を足し引きして毎回計算する**。

## 主要な機能

1. **初期設定** — 初回起動時のみ。ふたご2人＋保護者の名前と4桁暗証番号を決め、
   Firebase Authのアカウント3つを作成し、`meta/users` を書き込む
2. **ログイン** — 名前のカードを選び、4桁の暗証番号を入れる。裏でFirebase Authにサインイン
3. **入力**（支出 / 収入 / 振替の3種）— 金額・カテゴリー・支払い方法・日付・メモ。
   振替は「SBIネット銀行 → 他の残高」への移動として記録する
4. **音声入力** — 画面右下の🎤ボタン。Web Speech API（`ja-JP`）で聞き取り、
   金額・日付・カテゴリーを自動で埋め、残りをメモに入れる
   - 金額: 「1万5000円」「3千円」「800円」など（`parseVoiceAmount`）
   - 日付: 「7月30日」「7/30」「今日」「昨日」（`parseVoiceDate`）
   - カテゴリー: キーワード表 `VOICE_CAT_WORDS`（例: ラーメン・コンビニ → 食費）
5. **履歴** — 日付ごとに区切って表示。×ボタンで削除、**5秒間だけトーストから「元に戻す」**
6. **集計** — 月送り、前月からの繰越／今月の収支／月末残高、収入・支出・記録日数、
   いまの残高（口座別）、カテゴリー別の円グラフ、6か月の棒グラフ
7. **Excel出力** — 「この月」と「すべての記録」の2種類。シート名は `記録`
8. **続けやすさの工夫** — 連続記録日数（🔥ストリーク）表示、毎日のリマインダー通知
9. **保護者モード** — `parent` でログインすると入力・設定タブと🎤を隠し、集計から開始。
   「1人目 / 2人目 / 二人合計」を切り替えて閲覧できる

## 設計ルール（変更時も必ず守ること）

- **配色はミント系で統一**（双子ちゃん本人が選んだ色。勝手に変えない）
  - 背景 `#F0F6F1` / カード白 `#FFFFFF` / 枠線 `#DCEBE0`
  - アクセント `#4E8A6C`（ボタン・選択中のチップ）/ 淡いアクセント `#E2F0E8`
  - 文字 `#374440` / 補助文字 `#7F8F86`
  - `manifest.json` の `theme_color` は `#BFE0CD`、`background_color` は `#F0F6F1`
- **スマホ縦画面ファースト**。最大幅520px、下部固定タブナビ（入力 / 履歴 / 集計 / 設定）
- **ブラウザ標準の `alert()` `confirm()` は使わない**。通知は画面下のトーストで行う
- **文言は小学生〜中高生にも分かる、やさしい日本語**（「〜だよ」「〜してね」調）。
  記録するたびにランダムで褒め言葉を出す（`praise()`）
- **保護者は絶対に書き込めない**。UIで隠すだけでなく、Firestoreルールでも禁止する（二重で守る）
- **`sw.js` のキャッシュ名 `CACHE` はリリースのたびに必ず上げる**（現在 `kakeibo-v15`）。
  上げ忘れると古いファイルが表示され続ける
- Service Workerは**ページ本体はネット優先**（更新をすぐ反映）、画像などはキャッシュ優先。
  Firebase・CDNへの通信はキャッシュしない
- **Androidのホーム画面用に `purpose:"maskable"` を必ず指定する**（`"any maskable"` で兼用）
- 起動処理には**必ずタイムアウトを入れる**（`meta/users` 読み込み8秒、旧データ移行6秒）。
  電波が悪い時に真っ白なまま固まらないよう、失敗時は再読み込みボタンを出す

## ゼロから作り直す手順

1. Firebaseコンソールで新規プロジェクトを作成（Sparkプラン＝無料でよい）
2. Authentication → ログイン方法 → **メール／パスワードを有効化**
3. Cloud Firestore を作成し、上記の**セキュリティルールを貼り付けて公開**
4. 「Webアプリを追加」して `firebaseConfig` を取得し、`index.html` の該当部分に貼る
5. GitHubで新しいリポジトリを作り、5つのファイルをアップロード
6. Settings → Pages → main ブランチ / root を選んで公開（1〜3分で反映）
7. 公開URLをスマホのChromeで開き、初期設定画面で名前と暗証番号を登録
8. ホーム画面に追加（Android: ⋮ →「ホーム画面に追加」／ iPhone: 共有 →「ホーム画面に追加」）

## 過去に試して見送ったもの（同じ道を通らないために）

- **レシート撮影による自動入力** — 無料で使える読み取り方式では精度が足りず、削除した
- **アプリを閉じていても届くプッシュ通知** — サーバー（有料プラン）が必要なため保留。
  代わりに「アプリを開いている間だけ動くリマインダー」で妥協している
- **暗証番号をFirestoreに平文で保存する方式** — 初期の実装。Firebase Authに移行済み。
  `migrateToAuthIfNeeded()` が旧データを1回だけ自動移行するために残っている
  （新規に作り直す場合、この関数は不要）

## 既知の弱点・改修候補

- **繰越と月末残高の合計にSuicaとメルペイが含まれていない**
  （`carry += b1.sbi+b1.paypay+b1.cash+b1.other` の行）。意図的かどうか要確認
- 暗証番号は4桁＋固定の接尾辞なので、ソースを読める人には総当たりの余地がある。
  家族内利用のため許容しているが、外部に広く公開する用途には向かない
- 履歴は直近200件までしか表示していない
- 熟成中の記録が増えた場合のFirestore読み取り回数（無料枠は1日5万回）

## 依頼者について

- Excel VBA / Access を業務で日常的に使用。プログラミングの基礎知識あり
- 回答は日本語、結論を先に。作業前に PLAN（何をどう変えるか）を提示してほしい
- コードは断片ではなく、コピペでそのまま動く完全な形で示してほしい
- 実際に使うのは別居の双子のお子さん。**説明文はお子さん目線のやさしい言葉で**
