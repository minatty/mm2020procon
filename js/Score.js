// スコア管理
class Score  {
    constructor(val) {
      this.score = (val || 0);
    }
    get getScore() {
      return this.score;
    }
    set addScore(val) {
      this.score += val;
    }
    updateScore() {
        document.querySelector("#score").innerHTML = this.score;
    }
  };