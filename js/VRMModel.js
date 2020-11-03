class VRMModel {
  constructor (src) {
    // スクリーン要素
    this.screen = document.querySelector("#screen");

    // アニメーションさせる発音（語）
    this.pronunciation = '';
    
    // 実際にアニメーションさせる口の形
    this.mouthShape = '';

    // 口パクアニメーションさせる時間[sec]
    this.mouthAnimateTime = 0;

    // 口パクアニメーションの開始時間保持[sec]
    this.startMouthAnimateTime = 0;

    // 腕パクアニメーションの開始時間保持[sec]
    this.startArmAnimateTime = 0;

    // アニメーションさせるV/A
    this.valenceArousal = {};

    // 表情アニメーションさせる時間[sec]
    this.emotionAnimateTime = 0;

    // 表情アニメーションを開始してからの時間保持[sec]
    this.startEmotionAnimateTime = 0;

    // 口パクを滑らかにする（weightを常に1で返すかどうか）
    this.shapeAnimateFlg = true;

    // 腕を動かすかどうか
    this.swingArmFlg = true;

    this.armInitAngle = Math.PI / 2 - 0.3;

    // 曲のbeatタイミング[ms]
    this.beat = null;

    // アニメーション
    this.animate = this.onAnimate.bind(this);

    this.clock = new THREE.Clock();
    this.basePosition = new THREE.Vector3();

    // 選択された楽曲
    this.selectedSong = '';

    // 漢字変換配列
    this.convertArray = [];

    // 口の位置の微調整
    this.mouthPosElementX = document.querySelector("#mouthPositionAdjustX");
    this.mouthPosElementY = document.querySelector("#mouthPositionAdjustY");
    this.mouthPosElementZ = document.querySelector("#mouthPositionAdjustZ");

    // レンダラを作成
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setClearColor(0xffff00, 0);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.screen.appendChild(this.renderer.domElement);

    // カメラを作成
    this.camera = new THREE.PerspectiveCamera(15.0, window.innerWidth / window.innerHeight, 0.1, 100.0);
    this.camera.position.set(0.0, 1.25, 2.5);

    // Orbit Controlを作成
    const controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    controls.screenSpacePanning = true;
    controls.target.set(0.0, 1.25, 0.0);
    controls.update();

    // シーンを作成
    this.scene = new THREE.Scene();

    // グリッド床を作成
    const gridGround = new THREE.GridHelper(10);
    this.scene.add(gridGround);

    // ライトを作成
    const light = new THREE.DirectionalLight(0xffffff);
    light.position.set(1.0, 1.0, 1.0).normalize();
    this.scene.add(light);

    // VRMをロード
    const loader = new THREE.GLTFLoader();
    // loader.crossOrigin = 'anonymous'
    loader.load(src, async (gltf) => {
      this.model = await THREE.VRM.from(gltf);
      this.model.scene.rotation.set(Math.PI, 0, Math.PI);
      
      // ミクさんは頭身が低いので視線を下げる
      if ( src == '../vrm/shiwami.vrm' ) {
        this.camera.position.set(0.0, 0.8, 3.5);
        controls.target.set(0.0, 0.8, 0.0);
      }
      
      // 気を付けの姿勢
      this.model.humanoid.getBoneNode(THREE.VRMSchema.HumanoidBoneName.LeftUpperArm).rotation.z = this.armInitAngle;
      this.model.humanoid.getBoneNode(THREE.VRMSchema.HumanoidBoneName.RightUpperArm).rotation.z = -this.armInitAngle;

      this.scene.add(this.model.scene);
      this.animate();
    })
  }

  // まばたきのウェイト計算
  get blinkValue () {
    let weight = 0;
    let nowTime = this.clock.elapsedTime;
    // 5秒に１回まばたき
    if ( parseInt(nowTime) % 5 == 0 ) { // 5 <= nowTime < 6 秒の間で正 
      weight = (nowTime - parseInt(nowTime)) / 0.2;  // 0.2秒かけて閉じる
    }
    return weight <= 1 ? weight : 2 - weight;
  }

  // 口パクのウェイト計算
  get speakVowelValue () {
    let weight = 0;
    if ( this.shapeAnimateFlg ) {
      // 歌詞のduration秒かけて開く
      weight = (this.clock.elapsedTime - this.startMouthAnimateTime) / this.mouthAnimateTime;
    } else {
      // 一瞬で開く
      weight = 1;
    }

    return 1 < weight ? 1 : weight;
  }

  // 表情のウェイト計算（不使用）
  get speakEmotionValue () {
    // let weight = (this.clock.elapsedTime - this.startEmotionAnimateTime) / this.emotionAnimateTime;
    let weight = 1;

    return 1 < weight ? 1 : weight;
  }

  // 発声する音の母音（のシェイプ）を取得
  get nowVowel() {
    switch (this.mouthShape) {
      case 'A':
      case 'a':
        return THREE.VRMSchema.BlendShapePresetName.A;
      case 'I':
      case 'i':
        return THREE.VRMSchema.BlendShapePresetName.I;
      case 'U':
      case 'u':
        return THREE.VRMSchema.BlendShapePresetName.U;
      case 'E':
      case 'e':
        return THREE.VRMSchema.BlendShapePresetName.E;
      case 'O':
      case 'o':
        return THREE.VRMSchema.BlendShapePresetName.O;
      default:
        return THREE.VRMSchema.BlendShapePresetName.Neutral;
    }
  }

  // Headボーンのcanvas上座標を返す
  get getHeadBoneCordinate() {
    let mouthPositionAdjust = this.getMouthPositionAdjust;
    // mouthPositionAdjustスライドで微調整可能
    const mouthXY = new THREE.Vector3().set(
        mouthPositionAdjust.x,
        mouthPositionAdjust.y,
        mouthPositionAdjust.z
      );

    const headBone = this.model.humanoid.getBoneNode(THREE.VRMSchema.HumanoidBoneName.Head).clone();
    const pos = headBone.localToWorld(mouthXY);
    const pj = pos.project(this.camera);
    let ret = this.convertToScreenPosition(pj);

    // console.log("(x, y, z) = (" + pj.x + ", " + pj.y + ", " + pj.z + ")");
    // console.log("(x, y) = (" + ret.x + ", " + ret.y + ")");

    return ret;
  }

  // 腕の角度計算
  get getArmAngleValue() {
    if ( this.beat ) {
      let dur = this.beat.duration / 1000;
      return (Math.PI / 3) * ((this.clock.elapsedTime - this.startArmAnimateTime) / dur);
    } else {
      return this.armInitAngle;
    }
  }

  // 口の位置の微調整
  get getMouthPositionAdjust() {
    return {
      x : parseFloat(this.mouthPosElementX.value) / 100,
      y : parseFloat(this.mouthPosElementY.value) / 100,
      z : parseFloat(this.mouthPosElementZ.value) / 100,
    };
  }

  // スクリーン上座標に変換(vector3 → x,y)
  convertToScreenPosition(arg) {
    const screenWidth = this.screen.clientWidth;
    const screenHeight = this.screen.clientHeight;
    return {
      x: ((arg.x + 1) / 2) * screenWidth,
      y: ((-arg.y + 1) / 2) * screenHeight
    };
  }

  // 口パクをアニメーションさせるかどうか
  // しない場合は1Fで口を開く
  set setShapeAnimateFlg(flg) {
    this.shapeAnimateFlg = flg;
  }

  // 腕を動かすかどうか
  set setSwingArmFlg(flg) {
    this.swingArmFlg = flg;
  }

  // V/A値から適切な表情の状態を返そうと思ったけどvalenceArousalがnullを返してくるので未実装
  get nowEmotion() {
    console.log("Valence - Arousal :" + this.valenceArousal);
    return THREE.VRMSchema.BlendShapePresetName.Angry;
  }

  // 発音する語と口の形を設定する
  set setPronunciation(lyricChar) {
    this.pronunciation = lyricChar;
    this.mouthShape = VOWELS[lyricChar] || VOWELS[this.convertArray[lyricChar]];
    console.log("lyricChar = " + lyricChar + "(" + this.mouthShape + ")");
  }

  // 曲ごとに漢字母音変換配列を取得
  set setSelectedSong(song) {
    this.selectedSong = song;
    switch (song) {
      case 'https://www.youtube.com/watch?v=ygY2qObZv24':
        // 愛されなくても君がいる
        this.convertArray = INKI_KJ;
        break;
      case 'https://www.youtube.com/watch?v=a-Nf3QUFkOU':
        // ブレスユアブレス
        this.convertArray = BYB_KJ;
        break;
      case 'https://www.youtube.com/watch?v=XSLhsjepelI':
        // グリーンライツセレナーデ
        this.convertArray = GLC_KJ;
        break;
    }
  }

  set setBeat(beat) {
    this.beat = beat;
    this.setStartArmAnimateTime();
  }

  // 口のアニメーション開始時間セッター
  setStartMouthAnimateTime() {
    this.startMouthAnimateTime = this.clock.elapsedTime;
  }

  // 腕のアニメーション開始時間セッター
  setStartArmAnimateTime() {
    this.startArmAnimateTime = this.clock.elapsedTime;
  }

  // 表情のアニメーション開始時間セッター
  setStartEmotionAnimateTime() {
    this.startEmotionAnimateTime = this.clock.elapsedTime;
  }

  onAnimate() {
    const delta = this.clock.getDelta();

    if (this.model) {

      // ボーンアニメーション
      if ( this.beat && this.swingArmFlg ) {
        this.model.humanoid.getBoneNode(THREE.VRMSchema.HumanoidBoneName.LeftUpperArm).rotation.z = this.getArmAngleValue;
        this.model.humanoid.getBoneNode(THREE.VRMSchema.HumanoidBoneName.RightUpperArm).rotation.z = -this.getArmAngleValue;
      }

      // ブレンドシェイプアニメーション
      this.model.blendShapeProxy.setValue(THREE.VRMSchema.BlendShapePresetName.Blink, this.blinkValue);
      this.model.blendShapeProxy.setValue(this.nowVowel, this.speakVowelValue);
      this.model.blendShapeProxy.update();

      this.model.update(delta);
    }

    if (this.mixer) {
      this.mixer.update(delta);
    }
    this.renderer.render(this.scene, this.camera);
    window.requestAnimationFrame(this.animate);
  }

  // シェイプをリセット
  resetShapes() {
    this.model.blendShapeProxy.setValue(THREE.VRMSchema.BlendShapePresetName.A, 0.0);
    this.model.blendShapeProxy.setValue(THREE.VRMSchema.BlendShapePresetName.I, 0.0);
    this.model.blendShapeProxy.setValue(THREE.VRMSchema.BlendShapePresetName.U, 0.0);
    this.model.blendShapeProxy.setValue(THREE.VRMSchema.BlendShapePresetName.E, 0.0);
    this.model.blendShapeProxy.setValue(THREE.VRMSchema.BlendShapePresetName.O, 0.0);
  }

  // キャンバス削除
  deleteCanvas() {
    let parent = this.screen;
    let child = parent.firstChild;
    parent.removeChild(child);
  }
}