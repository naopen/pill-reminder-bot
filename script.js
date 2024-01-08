// 以下のコードは全てGoogle Apps Scriptで実行する
const token = 'LINE Notifyのアクセストークンを入力';
const lineNotifyApi = 'https://notify-api.line.me/api/notify';

// 曜日の配列
const dayList = ["日", "月", "火", "水", "木", "金", "土"];

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
	let weatherMessage = weather + ' 、今日の最高気温は ' + maxTemp + '℃ 、明日の最低気温は ' + minTemp + '℃ です。';
	weatherMessage += '降水確率：6-12時 ' + rain_12 + '、12-18時 ' + rain_18 + '、18-24時 ' + rain_24 + '、24-30時 ' + rain_30 + 'です。';

	return weatherMessage;

}

function doPost() {
	// 休薬期間の初期定義（2023年11月13日）
	// ここから7日間は休薬期間、それ以降の21日間は服薬期間
	// これを繰り返す
	const startDate = new Date(2023, 10, 13);

	// 今日の日付オブジェクトを生成
	const date = new Date();
	// // 時刻を今日の8時に設定する（テスト用）
	// date.setHours(8);
	// date.setMinutes(0);
	// // 日時を2023年12月18日に設定する（テスト用）
	// date.setFullYear(2023);
	// date.setMonth(12 - 1); // 1月は0から始まるため、1月を指定する場合は0を指定する
	// date.setDate(18);

	// 今日の時間を取得
	const hours = date.getHours();

	// 休薬期間の初期定義からの経過日数を計算
	const elapsedDays = Math.floor((date - startDate) / (1000 * 60 * 60 * 24));
	// 経過日数を7で割り、小数点以下を切り捨て、何週目かを計算
	const elapsedWeeks = Math.floor(elapsedDays / 7);
	// [4の倍数（1を含む）週] ならば休薬期間、そうでなければ服薬期間
	const isRestPeriod = (elapsedWeeks % 4) / 4 === 0 ? true : false;

	console.log("日時：" + date.toLocaleString());
	console.log('初期定義からの経過日数:', elapsedDays);
	console.log('初期定義からの経過週数:', elapsedWeeks);
	console.log('ex.) 初期定義からの経過週数が0（日数:0~6）なら休薬期間、1（日数:7~13）なら服薬期間、2なら服薬期間、3なら服薬期間、4なら休薬期間');
	console.log('isRestPeriod:', isRestPeriod);

	// メッセージを定義
	const dateMessage = '今日は' + date.getFullYear() + '年' + (date.getMonth() + 1) + '月' + date.getDate() + '日(' + dayList[date.getDay()] + ')、土浦の天気は ' + getWeather('080020') + ' です。';
	const restMessage = '【休薬期間】' + (elapsedDays % 7 + 1) + '日目'; //休薬期間の朝のメッセージ
	const takingMessage = '【服薬期間】の' + (elapsedWeeks % 4) + '週目、' + (elapsedDays % 7 + 1) + '日目'; //服薬期間の朝のメッセージ
	const takingMessage2 = 'もし昨日飲み忘れていた場合は、いま飲むようにしてください。'; //前日飲み忘れていた場合に今飲むように促すメッセージ
	const reminderMessage = 'ピル飲んだ？'; //夜のリマインドメッセージ
	const lastReminderMessage = 'これが最後のリマインドです！もうピル飲んだ？成否をこのメッセージにリアクションしてください。'; //寝る前のリマインドメッセージ

	// 服薬期間の初日かどうかを判定するフラグ
	let isTakingFirstDay = false;

	// 服薬期間の初日かどうかを計算
	if (!isRestPeriod && (elapsedDays - 7) % 28 === 0) {
		isTakingFirstDay = true;
	}
	console.log('isTakingFirstDay:', isTakingFirstDay);

	// 休薬期間で、時間が7時から9時の間なら、朝のメッセージを送信
	if (isRestPeriod && hours >= 7 && hours <= 9) {
		console.log("休薬期間で、時間が午前7時から9時の間なら、朝のメッセージを送信");
		sendMessage(dateMessage);
		sendMessage(restMessage);
	}
	// 服薬期間で、時間が7時から9時の間なら、朝のメッセージを送信
	else if (!isRestPeriod && hours >= 7 && hours <= 9) {
		console.log("服薬期間で、時間が午前7時から9時の間なら、朝のメッセージを送信");
		sendMessage(dateMessage);
		sendMessage(takingMessage);
		// もし服薬期間の初日でないなら、前日飲み忘れていた場合に今飲むように促すメッセージを送信
		if (!isTakingFirstDay) {
			sendMessage(takingMessage2);
		}
	}
	// 服薬期間で、時間が21時から23時の間なら、夜のリマインドメッセージを送信
	else if (!isRestPeriod && hours >= 22 && hours < 23) {
		console.log("服薬期間で、時間が午後10時から11時の間なら、夜のリマインドメッセージを送信");
		sendMessage(reminderMessage);
	}
	// 服薬期間で、時間が22時から24時の間なら、寝る前のリマインドメッセージを送信
	else if (!isRestPeriod && hours >= 23 && hours <= 24) {
		console.log("服薬期間で、時間が午後11時から12時の間なら、寝る前のリマインドメッセージを送信");
		sendMessage(lastReminderMessage);
	}
}

