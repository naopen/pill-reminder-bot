// 以下のコードは全てGoogle Apps Scriptで実行する
// LINE Notifyのアクセストークン
const token = 'LINE Notifyのアクセストークンを入力';
// LINE Notify APIのURL
const lineNotifyApi = 'https://notify-api.line.me/api/notify';

// LINE Messaging API のアクセストークン
const messagingApiToken = 'LINE Messaging APIのアクセストークンを入力';
// 送信先のLINEグループID
const groupId = 'LINEグループIDを入力';

// デバッグ用日時設定
// const debugDate = new Date('2024-07-28T22:00:00'); // 休薬期間の場合
// const debugDate = new Date('2024-08-04T22:00:00'); // 服薬期間の場合
const debugDate = null;

// リマインドする時間（分）
const REMINDER_MINUTES = 30;
// 返信がない時に再度リマインドするまでの時間（分）
const TIMEOUT_REMINDER_MINUTES = 20;

// 曜日の配列
const dayList = ["日", "月", "火", "水", "木", "金", "土"];

function sendMorningMessage() {
	// 現在の時刻またはデバッグ用日時を取得
	const now = debugDate || new Date();

	// メッセージを定義
	const dateMessage = `今日は${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日(${dayList[now.getDay()]})、土浦の天気は${getWeather('080020')}`;

	// 服薬期間判定
	if (isTakingPeriod(now)) {
		const elapsedDays = Math.floor((now - new Date(2023, 10, 13)) / (1000 * 60 * 60 * 24));
		const elapsedWeeks = Math.floor(elapsedDays / 7);
		const takingMessage = `【服薬期間】の${elapsedWeeks % 4}週目、${elapsedDays % 7 + 1}日目です。`;
		sendLineNotify(dateMessage);
		sendLineNotify(takingMessage);
		// 服薬期間の初日でない場合は、追加メッセージを送信
		if ((elapsedDays - 7) % 28 !== 0) {
			const takingMessage2 = 'もし昨日飲み忘れていた場合は、いま飲むようにしてください。';
			sendLineNotify(takingMessage2);
		}
	} else {
		const elapsedDays = Math.floor((now - new Date(2023, 10, 13)) / (1000 * 60 * 60 * 24));
		const restMessage = `【休薬期間】${elapsedDays % 7 + 1}日目です。`;
		sendLineNotify(dateMessage);
		sendLineNotify(restMessage);
	}
}

function sendPillReminder() {
	// 現在の時刻またはデバッグ用日時を取得
	const now = debugDate || new Date();

	// 服薬期間判定
	if (!isTakingPeriod(now)) {
		console.log("休薬期間のため、リマインドはスキップします。");
		return;
	}

	// LINE Notifyでリマインドメッセージを送信
	const message = 'ピルを飲む時間ですよ！';
	sendLineNotify(message);

	// 3秒後に確認メッセージを送信
	Utilities.sleep(3000); // 3秒待機
	sendConfirmationMessage();
}

// LINE Notifyでメッセージを送信
function sendLineNotify(message) {
	const options = {
		'method': 'post',
		'headers': {
			'Authorization': 'Bearer ' + token,
		},
		'payload': {
			'message': message,
		},
	};
	UrlFetchApp.fetch(lineNotifyApi, options);
}

// 天気予報を取得する関数
function getWeather(code) {
	const apiData = JSON.parse(UrlFetchApp.fetch('https://weather.tsukumijima.net/api/forecast/city/' + code).getContentText());
	// weatherDataに今日の天気の配列を格納
	const weatherDataToday = apiData.forecasts[0];
	const weatherDataTomorrow = apiData.forecasts[1];

	// 今日の天気を取得
	const weather = weatherDataToday.telop;
	// 今日の最高気温を取得
	const maxTemp = weatherDataToday.temperature.max.celsius;
	// 明日の最低気温を取得
	const minTemp = weatherDataTomorrow.temperature.min.celsius;
	// 今日の降水確率を取得
	// const rain_06 = weatherData.chanceOfRain.T00_06;
	const rain_12 = weatherDataToday.chanceOfRain.T06_12;
	const rain_18 = weatherDataToday.chanceOfRain.T12_18;
	const rain_24 = weatherDataToday.chanceOfRain.T18_24;
	const rain_30 = weatherDataTomorrow.chanceOfRain.T00_06;

	// メッセージを定義
	let weatherMessage = `${weather}、今日の最高気温は${maxTemp}℃、明日の最低気温は${minTemp}℃です。`;
	weatherMessage += `降水確率は、6-12時 ${rain_12}％、12-18時 ${rain_18}％、18-24時 ${rain_24}％、24-30時 ${rain_30}％ です。`;

	return weatherMessage;

}

// 服薬期間判定
function isTakingPeriod(date) {
	const startDate = new Date(2023, 10, 13); // 休薬期間開始日
	const elapsedDays = Math.floor((date - startDate) / (1000 * 60 * 60 * 24));
	const elapsedWeeks = Math.floor(elapsedDays / 7);
	return (elapsedWeeks % 4) / 4 !== 0; // 4の倍数週は休薬期間
}

function sendConfirmationMessage() {
	const message = {
		"type": "text",
		"text": "もうピルを飲みましたか？",
		"quickReply": {
			"items": [
				{
					"type": "action",
					"action": {
						"type": "message",
						"label": "はい",
						"text": "はい"
					}
				},
				{
					"type": "action",
					"action": {
						"type": "message",
						"label": "いいえ",
						"text": "いいえ"
					}
				},
				{
					"type": "action",
					"action": {
						"type": "message",
						"label": "家に忘れた",
						"text": "家に忘れた"
					}
				}
			]
		}
	};

	sendLineMessage(message);

	// TIMEOUT_REMINDER_MINUTES分後に再通知するトリガーを設定（ユーザーからの返信がない場合のみ）
	ScriptApp.newTrigger('sendReminderAgain')
		.timeBased()
		.after(TIMEOUT_REMINDER_MINUTES * 60 * 1000)
		.create();
}

// LINE Message APIでメッセージを送信 (Reply API / Push API)
function sendLineMessage(message, replyToken = null) {
	const options = {
		'method': 'post',
		'headers': {
			'Authorization': 'Bearer ' + messagingApiToken,
			'Content-Type': 'application/json',
		},
		'payload': JSON.stringify({
			'replyToken': replyToken, // Reply APIの場合はreplyTokenを指定
			'to': groupId,
			'messages': [message],
		}),
	};
	const url = replyToken
		? 'https://api.line.me/v2/bot/message/reply' // Reply APIのURL
		: 'https://api.line.me/v2/bot/message/push'; // Push APIのURL
	UrlFetchApp.fetch(url, options);
}

// TIMEOUT_REMINDER_MINUTES分後に再通知するトリガーを削除
function deleteReminderAgainTrigger() {
	const triggers = ScriptApp.getProjectTriggers();
	for (let i = 0; i < triggers.length; i++) {
		if (triggers[i].getHandlerFunction() === 'sendReminderAgain') {
			ScriptApp.deleteTrigger(triggers[i]);
			break;
		}
	}
}

function doPost(e) {
	const events = JSON.parse(e.postData.contents).events;
	for (const event of events) {
		if (event.type === 'message' && event.message.type === 'text') {
			const replyToken = event.replyToken; // Reply API用のトークンを取得
			const userMessage = event.message.text;
			if (userMessage === 'はい') {
				sendLineMessage({
					"type": "text",
					"text": "偉いですね！飲み忘れずに続けましょう！"
				}, replyToken); // Reply APIで送信
				deleteReminderAgainTrigger(); // トリガーを削除
			} else if (userMessage === 'いいえ') {
				// 表示する時間を文字列に変換
				const reminderTime = REMINDER_MINUTES + '分後';
				sendLineMessage({
					"type": "text",
					"text": `${reminderTime}に再度リマインドしますね。`
				}, replyToken); // Reply APIで送信
				deleteReminderAgainTrigger(); // トリガーを削除
				// REMINDER_MINUTES分後に再通知
				ScriptApp.newTrigger('sendPillReminder')
					.timeBased()
					.after(REMINDER_MINUTES * 60 * 1000)
					.create();
			} else if (userMessage === '家に忘れた') {
				sendLineMessage({
					"type": "text",
					"text": `確認します。飲み忘れに注意してくださいね。`
				}, replyToken); // Reply APIで送信
				deleteReminderAgainTrigger(); // トリガーを削除
			} else {
				// 表示する時間を文字列に変換
				const reminderAgainTime = TIMEOUT_REMINDER_MINUTES + '分後';
				sendLineMessage({
					"type": "text",
					"text": `はい、いいえ、家に忘れたのいずれかでお答えください。${reminderAgainTime}に再度リマインドしますね。`
				}, replyToken); // Reply APIで送信
			}
		}
	}
}

function sendReminderAgain() {
	sendPillReminder();
}
