const { Player } = TextAliveApp;

// 歌詞表示領域
let lyricsArea = document.querySelector("#lyrics");

// 楽曲セレクタ
const songSelector = document.querySelector("#songSelector");

// スタートボタン
const startButton = document.querySelector("#start");

// 3Dモデル表示領域
const screen = document.querySelector("#screen");

// 口パクディレイ調整バー
const syncDelayTime = document.querySelector("#syncDelayTime");
// 口パクディレイ調整値(表示用)
const currentDelayTime = document.querySelector("#currentDelayTime");


let player;

let currentBeat, currentChorus, latestChar, latestWord, latestPhrase;
let adjustValueC =  parseInt(syncDelayTime.value);  // 口パク表示の微調整幅(任意)[ms]
let adjustValueP = 1000;  // フレーズ表示の微調整幅[ms]


startButton.addEventListener("click", (e) => {
  let songUrl = songSelector.value;
  resetLyrics();
  if (player) {
    // ボタンをいったん非活化
    document.querySelector("#control > a#play").className = "disabled";
    document.querySelector("#control > a#stop").className = "disabled";
    document.querySelector("#control > a#backward").className = "disabled";
    document.querySelector("#control > a#forward").className = "disabled";
    player.createFromSongUrl(songUrl);
  } else {
      player = new Player({
        app: true,
        mediaElement: document.querySelector('#media')
      });
  }

  console.log("songSelector = " + songUrl);

  /* playerのイベント登録 */
  player.addListener({
    /* APIの準備ができたら呼ばれる */
    onAppReady(app) {
      if (app.managed) {
        document.querySelector("#control").className = "disabled";
      }
      if (!app.songUrl) {
        player.createFromSongUrl(songUrl);
      }
    },

    /* 楽曲情報が取得時処理 */
    onVideoReady(video) {
      // 楽曲情報を表示
      document.querySelector("#artist span").textContent = player.data.song.artist.name;
      document.querySelector("#song span").textContent = player.data.song.name;

      // 最後に表示した文字の情報をリセット
      latestChar = null;
      latestWord = null;
      latestPhrase = null;
      if (vrmModel) vrmModel.setSelectedSong = document.querySelector("#songSelector").value;
  
      // 口パクタイミングディレイ幅設定
      let event = document.createEvent("HTMLEvents");
      event.initEvent("change");
      syncDelayTime.dispatchEvent(event);
    },

    /* 再生コントロール可能 */
    onTimerReady() {
      // ボタン表示初期化
      const aPlay = document.querySelector("#control > a#play");
      while (aPlay.firstChild) aPlay.removeChild(aPlay.firstChild);
      aPlay.appendChild(document.createTextNode("\uf144"));
      document.querySelector("#control > a#play").className = "";
      document.querySelector("#control > a#stop").className = "";
      document.querySelector("#control > a#backward").className = "";
      document.querySelector("#control > a#forward").className = "";

      // 全フレーズのアニメーションを登録
      player.video.phrases.forEach( (phrase) => {
        phrase.animate = phraseAnimation;
      });
    },

    /* 再生位置の更新時の処理 */
    onTimeUpdate(position) {
      // 現在のビート情報を取得
      let beat = player.findBeat(position);
      if (currentBeat !== beat) {
        if (vrmModel) vrmModel.setBeat = beat;
        // サビになったら背景を変更する
        if (player.findChorus(position)) {
          bgAnimation(beat);
        }
        currentBeat = beat;
      }


      // 歌詞情報がなければこれで処理を終わる
      if (!player.video.firstChar) {
        return;
      }

      // 巻き戻っていたら歌詞表示をリセットする
      if (latestChar && latestChar.startTime > position + 1000 ) {
        resetLyrics();
      }

      if ( !player.video.findChar(position) ) {
        vrmModel.resetShapes();
        vrmModel.setPronunciation = '-';
      }

      // adjustValueC[ms]後に発声される文字を取得
      adjustValueC = parseInt(syncDelayTime.value);
      let currentC = latestChar || player.video.firstChar;
      while ( currentC && (currentC.startTime < position + adjustValueC) ) {
        // 新しい文字が発声されようとしている
        if (latestChar !== currentC) {
          onKuchipaku(currentC);
          latestChar = currentC;
        }
        if (latestWord !== currentC.parent) {
          createWord(currentC.parent);
          latestWord = currentC.parent;
        }
        currentC = currentC.next;
      }
    },

    /* 楽曲の再生 */
    onPlay() {
      const aPlay = document.querySelector("#control > a#play");
      while (aPlay.firstChild) aPlay.removeChild(aPlay.firstChild);
      aPlay.appendChild(document.createTextNode("\uf28b"));
    },

    /* 楽曲の一時停止 */
    onPause() {
      const aPlay = document.querySelector("#control > a#play");
      while (aPlay.firstChild) aPlay.removeChild(aPlay.firstChild);
      aPlay.appendChild(document.createTextNode("\uf144"));
    }
  });
});

/* 再生・一時停止ボタン */
document.querySelector("#control > a#play").addEventListener("click", (e) => {
  e.preventDefault();
  if (player) {
    player.volume = document.querySelector("#volumeControl").value;
    if (player.isPlaying) {
      player.requestPause();
    } else {
      player.requestPlay();
    }
  }
  return false;
});

/* 停止ボタン */
document.querySelector("#control > a#stop").addEventListener("click", (e) => {
  e.preventDefault();
  if (player) {
    // 再生を停止し歌詞表示をリセットする
    player.requestStop();
    resetLyrics();
  }
  return false;
});

/* 巻き戻しボタン */
document.querySelector("#control > a#backward").addEventListener("click", (e) => {
  e.preventDefault();
  if (player) {
    player.requestMediaSeek(player.mediaPosition - 5000);
  }
  return false;
});

/* 早送りボタン */
document.querySelector("#control > a#forward").addEventListener("click", (e) => {
  e.preventDefault();
  if (player) {
    player.requestMediaSeek(player.mediaPosition + 5000);
  }
  return false;
});

/* 音量調整シーク時のイベント */
document.querySelector("#volumeControl").addEventListener("change", (e) => {
  if (player) {
    player.volume = e.currentTarget.value;
  }
});

/* 口パクタイミング調整時のイベント */
syncDelayTime.addEventListener("change", (e) => {
  currentDelayTime.textContent = e.currentTarget.value;
});

/* 歌詞出現位置 X 調整時のイベント */
document.querySelector("#mouthPositionAdjustX").addEventListener("change", (e) => {
  document.querySelector("#currentAdjustValueX").textContent = parseFloat(e.currentTarget.value) / 100;
});
/* 歌詞出現位置 Y 調整時のイベント */
document.querySelector("#mouthPositionAdjustY").addEventListener("change", (e) => {
  document.querySelector("#currentAdjustValueY").textContent = parseFloat(e.currentTarget.value) / 100;
});
/* 歌詞出現位置 Z 調整時のイベント */
document.querySelector("#mouthPositionAdjustZ").addEventListener("change", (e) => {
  document.querySelector("#currentAdjustValueZ").textContent = parseFloat(e.currentTarget.value) / 100;
});

/* 背景点滅アニメーション */
function bgAnimation(beat) {
  let elm = document.querySelector("#backgroundImageSabi");
  if ( elm.style.animationName == "fadeInBGImage" ) {
    elm.style.animationName = "fadeOutBGImage";
  } else {
    elm.style.animationName = "fadeInBGImage";
  }
	elm.style.animationDuration = beat.duration + "ms";
	// elm.style.animationFillMode = 'forwards';
}

/**
 * charごとに口パクアニメーション
 */
function onKuchipaku(current) {
  if ( vrmModel ) {
    // 口パク
    vrmModel.setStartMouthAnimateTime();
    vrmModel.mouthAnimateTime = current.duration / 1000; // threejsのdurationは[sec]
    if ( current.text == 'ー' || current.text == '！' || current.text == '？' ) {
      // 長音・記号は前のものを使う(いきなり長音から始まらない前提)
      vrmModel.setPronunciation = current.previous.text;
    } else {
      vrmModel.resetShapes();
      vrmModel.setPronunciation = current.text;
    }

    // 表情（データなし）
    // vrmModel.setStartEmotionAnimateTime();
    // vrmModel.emotionAnimateTime = current.duration / 1000;
    // vrmModel.valenceArousal = player.getValenceArousal(current.startTime);
  }
}

/**
 * 歌詞を表示（word)
 */
function createWord(current) {
	const classes = [];

	const div = document.createElement("div");
	div.className = classes.join();
	div.appendChild(document.createTextNode(current.text));
	// div.appendChild(document.createTextNode("○"));

  // 文字を画面上に追加
	const marginTime = 2000;
	const dispTime =  current.duration + marginTime;
	const container = document.createElement("div");
	container.style.animationName = 'fadeInOut';
	container.style.animationDuration = dispTime + 'ms';
	container.style.animationFillMode = 'forwards';
	container.style.position = 'fixed';
	container.style.zIndex = 4;
	charElm = container.appendChild(div);
	container.addEventListener("click", () => {
    tapLyrics(container, current.duration);
  });
  lyricsArea.appendChild(container);
  let posX, posY;
  if (vrmModel) {
    let canvasXY = vrmModel.getHeadBoneCordinate;
    posX = canvasXY.x + screen.offsetLeft - (container.clientWidth / 2);
    posY = canvasXY.y + screen.offsetTop;
  } else {
    posX = Math.floor(Math.random() * (document.body.clientWidth - container.clientWidth));
    posY = Math.floor(Math.random() * (document.body.clientHeight - container.clientHeight));
  }
	container.style.top = posY + 'px';
	container.style.left = posX + 'px';
  let animateArr = wordAppearAnimate(charElm);
  charElm.animate(animateArr, dispTime);
  // 消えたころに削除する
  setTimeout(() => {
    try {
      container.parentNode.removeChild(container);
    } catch {
      console.log(container);
    }
  }, dispTime + 100);
}

/**
 * 歌詞のフレーズにアニメーションメソッドを登録する
 */
function phraseAnimation(now, unit) {
  if ( unit.contains(now + adjustValueP) ) {
    if (latestPhrase !== unit) {
      createPhrase(unit);
      latestPhrase = unit;
    }
  }
}

/**
 * 歌詞を表示（フレーズ）
 */
function createPhrase(current) {
	const classes = [];

	const div = document.createElement("div");
	div.className = classes.join();
	div.appendChild(document.createTextNode(current.text));

  // 文字を画面上に追加
	const marginTime = 2000;
	const dispTime =  current.duration + marginTime;
	const container = document.createElement("div");
	container.style.animationName = 'fadeInOut';
	container.style.animationDuration = dispTime + 'ms';
	container.style.animationFillMode = 'forwards';
	container.style.position = 'fixed';
	container.style.zIndex = 4;
  container.appendChild(div);
	container.addEventListener("click", () => {
    container.parentNode.removeChild(container);
  });
  lyricsArea.appendChild(container);
  container.className = "phraseLyrics";
	const posX = Math.floor(Math.random() * (document.body.clientWidth - container.clientWidth));
  const posY = document.body.clientHeight - container.clientHeight;
	container.style.top = posY + 'px';
	container.style.left = posX + 'px';
  // 消えたころに削除する
  setTimeout(() => {
    try {
      container.parentNode.removeChild(container);
    } catch {
      console.log(container);
    }
  }, dispTime + 100);
}

/**
 * フレーズ文字をタップしたときの処理
 */
function tapLyrics(elm, duration) {
  // 要素を削除
  // アニメーションを追加(2種類ランダム)
  elm.style.animationName = "";
  let animateArr = Math.random() < 0.5 ? wordDisappearAnimateA(elm) : wordDisappearAnimateB(elm);
  elm.animate(animateArr, 800);

  // スコアを加算
  let addValue = Math.floor(100000 / duration);
  score.addScore = addValue;
  score.updateScore();

}

/**
 * 歌詞表示リセット
 */
function resetLyrics() {
  latestChar = null;
  latestWord = null;
  latestPhrase = null;
  let parent = lyricsArea.parentNode;
  
  let children = lyricsArea.children;
  for (let child of children)
    child.parentNode.removeChild(child);
}
