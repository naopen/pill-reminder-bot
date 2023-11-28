// 以下のコードは全てGoogle Apps Scriptで実行する
const token = 'LINE Notifyのアクセストークンを入力';
const lineNotifyApi = 'https://notify-api.line.me/api/notify';

// メッセージを送信する関数
function sendMessage(message) {
	// メッセージの送信設定
	const options = {
		"method": "post",
		"payload": { "message": message },
		"headers": { "Authorization": "Bearer " + token }
	};
	UrlFetchApp.fetch(lineNotifyApi, options);
}

function doPost() {
	// メッセージを定義
	const restMessage = '今日は【休薬期間】です。'; //休薬期間の朝のメッセージ
	const takingMessage = '今日は【服薬期間】です。ピルを飲み忘れないように気をつけてください。'; //服薬期間の朝のメッセージ
	const reminderMessage = 'ピル飲んだ？成否をこのメッセージにリアクションしてください。'; //夜のリマインドメッセージ

	// 休薬期間の初期定義（2023年11月13日）
	// ここから7日間は休薬期間、それ以降の21日間は服薬期間
	// これを繰り返す
	const startDate = new Date(2023, 10, 13);

	// 今日の日付オブジェクトを生成
	const date = new Date();
	// // 時刻を今日の22時に設定する（テスト用）
	// date.setHours(22);
	// date.setMinutes(0);
	// // 日時を2024年1月8日に設定する（テスト用）
	// date.setFullYear(2024);
	// date.setMonth(1 - 1); // 1月は0から始まるため、1月を指定する場合は0を指定する
	// date.setDate(8);

	// 今日の時間を取得
	const hours = date.getHours();

	// 休薬期間の初期定義からの日数を計算
	const restDays = Math.floor((date - startDate) / (1000 * 60 * 60 * 24));
	// 休薬期間の日数を7で割り、小数点以下を切り捨て、何週目かを計算
	const restDaysDivided = Math.floor(restDays / 7);
	// [4の倍数（1を含む）週] ならば休薬期間、そうでなければ服薬期間
	const isRestPeriod = (restDaysDivided % 4) / 4 === 0 ? true : false;

	console.log('restDaysDivided:', restDaysDivided);
	console.log('isRestPeriod:', isRestPeriod);
	console.log("日時：" + date.toLocaleString());

	// 休薬期間で、時間が7時から9時の間なら、朝のメッセージを送信
	if (isRestPeriod && hours >= 7 && hours <= 9) {
		console.log("休薬期間で、時間が7時から9時の間なら、朝のメッセージを送信");
		sendMessage(restMessage);
	}
	// 服薬期間で、時間が7時から9時の間なら、朝のメッセージを送信
	else if (!isRestPeriod && hours >= 7 && hours <= 9) {
		console.log("服薬期間で、時間が7時から9時の間なら、朝のメッセージを送信");
		sendMessage(takingMessage);
	}
	// 服薬期間で、時間が21時から23時の間なら、夜のリマインドメッセージを送信
	else if (!isRestPeriod && hours >= 21 && hours <= 23) {
		console.log("服薬期間で、時間が21時から23時の間なら、夜のリマインドメッセージを送信");
		sendMessage(reminderMessage);
	}
}

