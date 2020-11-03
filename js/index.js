let vrmModel = null;
let score = new Score();

document.querySelector("#panelIcon > #open").addEventListener("click", () => {
  document.querySelector("#controlPanel").className = "controlPanel";
  document.querySelector("#panelIcon > #open").className = "fas fa-chevron-right displayNone";
  document.querySelector("#panelIcon > #close").className = "fas fa-chevron-left ";
});

document.querySelector("#panelIcon > #close").addEventListener("click", () => {
  document.querySelector("#controlPanel").className = "controlPanel controlPanel_close";
  document.querySelector("#panelIcon > #open").className = "fas fa-chevron-right";
  document.querySelector("#panelIcon > #close").className = "fas fa-chevron-left displayNone";
});

// モデル選択イベント定義
document.querySelector("#sendagaya-shino").addEventListener("click", () => {
  loadVRM('../vrm/sendagaya-shino.vrm');
  console.log("sendagaya-shino selected.");
});
document.querySelector("#shiwa-model").addEventListener("click", () => {
  loadVRM('../vrm/shiwami.vrm');
  console.log("shiwa-model selected.");
});
document.querySelector("#original-model").addEventListener("click", () => {
  loadVRM('../vrm/original.vrm');
  console.log("original-model selected.");
});
// モデル呼び出し
function loadVRM(vrmPath) {
  if (vrmModel) vrmModel.deleteCanvas();
  vrmModel = null;
  vrmModel = new VRMModel(vrmPath);
  vrmModel.setSelectedSong = document.querySelector("#songSelector").value;
  vrmModel.setShapeAnimateFlg = document.querySelector("#chkShapeAnimate").checked;
  vrmModel.setSwingArmFlg = document.querySelector("#chkSwingArm").checked;
}

document.querySelector("#chkShapeAnimate").addEventListener("change", () => {
  if (vrmModel) vrmModel.setShapeAnimateFlg = document.querySelector("#chkShapeAnimate").checked;
});

document.querySelector("#chkSwingArm").addEventListener("change", () => {
  if (vrmModel) vrmModel.setSwingArmFlg = document.querySelector("#chkSwingArm").checked;
});

// range要素へのホイール操作定義
document.querySelectorAll("input[type=range]").forEach( (elm) => elm.addEventListener("wheel", (e) => {
  e.preventDefault();
  const srcElm = e.currentTarget;
  let val = parseInt(srcElm.value);
  let wheelDir = -1 * (e.deltaY / Math.abs(e.deltaY)); // ホイールの回転方向(+/-)
  let quantity = (srcElm.max - srcElm.min) / 50;  // 移動量(全体の1/50)
  let adjust = quantity * wheelDir;
  srcElm.value = (val += adjust);
  
  let event = document.createEvent("HTMLEvents");
  event.initEvent("change");
  srcElm.dispatchEvent(event);
}));