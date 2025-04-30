// 以下のコードは全てGoogle Apps Scriptで実行する

// LINE Messaging API のアクセストークンとグループIDのペア（最大5ペア）
const messagingApiConfigs = [
	// ペア1（既存）
	{
		token: 'YOUR_TOKEN_1',
		groupId: 'YOUR_GROUP_ID_1'
	},
	// ペア2〜5（新規追加）- 実際のトークンとグループIDに置き換えてください
	{
		token: 'YOUR_TOKEN_2',
		groupId: 'YOUR_GROUP_ID_2'
	},
	{
		token: 'YOUR_TOKEN_3',
		groupId: 'YOUR_GROUP_ID_3'
	},
	{
		token: 'YOUR_TOKEN_4',
		groupId: 'YOUR_GROUP_ID_4'
	},
	{
		token: 'YOUR_TOKEN_5',
		groupId: 'YOUR_GROUP_ID_5'
	}
];

// 現在使用中のAPI設定のインデックス
let currentApiConfigIndex = 0;

// デバッグ用日時設定
// const debugDate = new Date('2024-07-28T22:00:00'); // 休薬期間の場合
// const debugDate = new Date('2024-08-04T22:00:00'); // 服薬期間の場合
const debugDate = null;

// 返信がない時に再度リマインドするまでの時間（分）
const TIMEOUT_REMINDER_MINUTES = 20;

// 曜日の配列
const dayList = ["日", "月", "火", "水", "木", "金", "土"];

function sendMorningMessage() {
	// 現在の時刻またはデバッグ用日時を取得
	const now = debugDate || new Date();

	// 日付メッセージを作成
	const dateMessage = `今日は${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日(${dayList[now.getDay()]})、土浦の天気は${getWeather('080020')}`;

	// 服薬期間判定
	let medicationMessage = "";

	// 2023年11月13日を基準日とする（JavaScriptでは月は0から始まるため10=11月）
	const baseDate = new Date(2023, 10, 13);
	const elapsedDays = Math.floor((now - baseDate) / (1000 * 60 * 60 * 24));
	const elapsedWeeks = Math.floor(elapsedDays / 7);
	const cyclePosition = elapsedWeeks % 4; // 0, 1, 2, 3
	const weekNumber = cyclePosition + 1; // 1, 2, 3, 4
	const dayInWeek = elapsedDays % 7 + 1; // 1〜7日目

	if (isTakingPeriod(now)) {
		medicationMessage = `【服薬期間】の${weekNumber}週目、${dayInWeek}日目です。`;

		// 服薬期間の初日でない場合は、追加メッセージを送信
		if (!(cyclePosition === 0 && dayInWeek === 1)) {
			medicationMessage += '\nもし昨日飲み忘れていた場合は、いま飲むようにしてください。';
		}
	} else {
		medicationMessage = `【休薬期間】${dayInWeek}日目です。`;
	}

	// メッセージを一つにまとめて送信
	const fullMessage = `${dateMessage}\n\n${medicationMessage}`;
	sendLineMessage({
		"type": "text",
		"text": fullMessage
	});
}

function sendPillReminder() {
	// 現在の時刻またはデバッグ用日時を取得
	const now = debugDate || new Date();

	// 休薬期間か服薬期間かを判定
	const isInTakingPeriod = isTakingPeriod(now);

	// 休薬期間と服薬期間でメッセージを分ける
	const reminderText = isInTakingPeriod
		? "ピルと精神科のお薬を飲む時間ですよ！"
		: "精神科のお薬を飲む時間ですよ！";

	// リマインドと確認を1つのメッセージにまとめて送信（API呼び出し削減のため）
	// クイックリプライ付きで直接送信
	const message = {
		"type": "text",
		"text": `${reminderText}\nもう飲みましたか？`,
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
						"label": "今日は無理",
						"text": "今日は無理"
					}
				}
			]
		}
	};

	// LINE Messaging APIでメッセージを直接送信
	sendLineMessage(message);

	// TIMEOUT_REMINDER_MINUTES分後に再通知するトリガーを設定（ユーザーからの返信がない場合のみ）
	ScriptApp.newTrigger('sendReminderAgain')
		.timeBased()
		.after(TIMEOUT_REMINDER_MINUTES * 60 * 1000)
		.create();
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
	weatherMessage += `降水確率は、6-12時 ${rain_12}、12-18時 ${rain_18}、18-24時 ${rain_24}、24-30時 ${rain_30} です。`;

	return weatherMessage;
}

// 服薬期間判定
function isTakingPeriod(date) {
	// 2023年11月13日を基準日とする（JavaScriptでは月は0から始まるため10=11月）
	const startDate = new Date(2023, 10, 13);
	const elapsedDays = Math.floor((date - startDate) / (1000 * 60 * 60 * 24));
	const elapsedWeeks = Math.floor(elapsedDays / 7);
	const cyclePosition = elapsedWeeks % 4; // 0, 1, 2, 3
	return cyclePosition !== 3; // 4週目（index=3）が休薬期間、それ以外は服薬期間
}

// 不要になったため削除 - sendPillReminder内に統合済み

function askReminderMinutes(replyToken) {
	const message = {
		"type": "text",
		"text": "再度リマインドですね！何分後にしますか？",
		"quickReply": {
			"items": [
				{
					"type": "action",
					"action": {
						"type": "message",
						"label": "15分後",
						"text": "15"
					}
				},
				{
					"type": "action",
					"action": {
						"type": "message",
						"label": "30分後",
						"text": "30"
					}
				},
				{
					"type": "action",
					"action": {
						"type": "message",
						"label": "60分後",
						"text": "60"
					}
				},
				{
					"type": "action",
					"action": {
						"type": "message",
						"label": "90分後",
						"text": "90"
					}
				}
			]
		}
	};
	sendLineMessage(message, replyToken);
}

// LINE Message APIでメッセージを送信する関数（API制限対応付き）
function sendLineMessage(message, replyToken = null) {
	let success = false;
	let attempts = 0;

	while (!success && attempts < messagingApiConfigs.length) {
		try {
			const currentConfig = messagingApiConfigs[currentApiConfigIndex];

			const options = {
				'method': 'post',
				'headers': {
					'Authorization': 'Bearer ' + currentConfig.token,
					'Content-Type': 'application/json',
				},
				'payload': JSON.stringify({
					'replyToken': replyToken, // Reply APIの場合はreplyTokenを指定
					'to': currentConfig.groupId,
					'messages': [message],
				}),
				'muteHttpExceptions': true // HTTPエラーを例外にしない
			};

			const url = replyToken
				? 'https://api.line.me/v2/bot/message/reply' // Reply APIのURL
				: 'https://api.line.me/v2/bot/message/push'; // Push APIのURL

			const response = UrlFetchApp.fetch(url, options);
			const responseCode = response.getResponseCode();

			if (responseCode === 200) {
				// 成功
				success = true;
			} else if (responseCode === 429) {
				// Too Many Requests - 次のAPIペアを試す
				currentApiConfigIndex = (currentApiConfigIndex + 1) % messagingApiConfigs.length;
				console.log(`API制限に達しました。次のAPIペア(${currentApiConfigIndex})に切り替えます。`);
			} else {
				// その他のエラー
				console.error(`LINE APIエラー: ${responseCode} - ${response.getContentText()}`);
				currentApiConfigIndex = (currentApiConfigIndex + 1) % messagingApiConfigs.length;
			}
		} catch (e) {
			console.error(`例外が発生しました: ${e.toString()}`);
			currentApiConfigIndex = (currentApiConfigIndex + 1) % messagingApiConfigs.length;
		}

		attempts++;
	}

	if (!success) {
		console.error("すべてのAPI設定でメッセージの送信に失敗しました");
	}
}

// TIMEOUT_REMINDER_MINUTES分後に再通知するトリガーを削除
function deleteReminderAgainTrigger() {
	const triggers = ScriptApp.getProjectTriggers();
	for (let i = 0; i < triggers.length; i++) {
		if (triggers[i].getHandlerFunction() === 'sendReminderAgain') {
			ScriptApp.deleteTrigger(triggers[i]);
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
				deleteReminderAgainTrigger(); // 既存の再通知トリガーを削除
			} else if (userMessage === 'いいえ') {
				askReminderMinutes(replyToken); // 何分後にリマインドするか尋ねる
			} else if (userMessage === '今日は無理') {
				sendLineMessage({
					"type": "text",
					"text": `確認します。飲み忘れに注意してくださいね。`
				}, replyToken); // Reply APIで送信
				deleteReminderAgainTrigger(); // 既存の再通知トリガーを削除
			} else if (userMessage.match(/^[0-9]+$/)) { // 数字のみのメッセージの場合
				const minutes = parseInt(userMessage, 10);
				sendLineMessage({
					"type": "text",
					"text": `${minutes}分後に再度リマインドしますね。`
				}, replyToken); // Reply APIで送信
				// minutes分後に再通知
				deleteReminderAgainTrigger(); // 既存の再通知トリガーを削除
				ScriptApp.newTrigger('sendReminderAgain')
					.timeBased()
					.after(minutes * 60 * 1000)
					.create();
			} else {
				// 表示する時間を文字列に変換
				const reminderAgainTime = TIMEOUT_REMINDER_MINUTES + '分後';
				sendLineMessage({
					"type": "text",
					"text": `選択肢からボタンを押して回答してください。${reminderAgainTime}に再度リマインドしますね。`
				}, replyToken); // Reply APIで送信
			}
		}
	}
}

function sendReminderAgain() {
	// 現在の時刻またはデバッグ用日時を取得
	const now = debugDate || new Date();

	// 休薬期間か服薬期間かを判定
	const isInTakingPeriod = isTakingPeriod(now);

	// 休薬期間と服薬期間でメッセージを分ける
	const reminderText = isInTakingPeriod
		? "ピルと精神科のお薬を飲む時間ですよ！"
		: "精神科のお薬を飲む時間ですよ！";

	// リマインド再送信
	const message = {
		"type": "text",
		"text": `お薬の飲み忘れ防止のため、再度お知らせします。\n${reminderText}\nもう飲みましたか？`,
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
						"label": "今日は無理",
						"text": "今日は無理"
					}
				}
			]
		}
	};

	// LINE Messaging APIでメッセージを直接送信
	sendLineMessage(message);

	// 次のリマインダーのタイマーを設定
	ScriptApp.newTrigger('sendReminderAgain')
		.timeBased()
		.after(TIMEOUT_REMINDER_MINUTES * 60 * 1000)
		.create();
}
