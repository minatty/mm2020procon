// wordが出現する時のアニメーション配列を返す
function wordAppearAnimate(elm) {
    let docWidth = document.documentElement.clientWidth - (elm.clientWidth * 2.5);
    let docHeight = document.documentElement.clientHeight - (elm.clientHeight * 2.5);
    let arr = [];
    let ranX, ranY, dirX, dirY, scale = 1;
    const moveTimes = 1;
    for (let i=0; i<moveTimes; i++) {
        let dirX = Math.random() < 0.5 ? 1 : -1;
        let dirY = Math.random() < 0.5 ? 1 : -1;
        ranX = dirX * Math.floor(Math.random() * docWidth);
        ranY = dirY * (Math.floor(Math.random() * (docHeight -200)) + 200);
        scale += (Math.random() * 4);

        arr[i] = {
            transform : 'translate(' + ranX + 'px,' + ranY + 'px) scale(' + scale + ') rotate3d(1,0,1, 1.72rad)'
        }
    }
    return arr;
}

// wordが消えるときのアニメーションAを返す
function wordDisappearAnimateA(elm) {
    let destX = document.body.clientWidth / 2;
    return {
        transform: 'translate(0px, -1000px) scale(0) rotateX(360deg)'
    };
}

// wordが消えるときのアニメーションBを返す
function wordDisappearAnimateB(elm) {
    let destX = document.body.clientWidth / 2;
    return [{
        transform: 'translate(0px, -90px)'
    },{
        transform: 'translate(0px, 1000px) scale(0)'
    }];
}