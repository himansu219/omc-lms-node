class MobAppError {
    constructor(res) {
      this.res = res;
    }
  
    errorResponse(data) {
      this.res.status(200).json({
        status: "fail",
        data,
      });
    }
    createResponse(data) {
      this.res.status(201).json({
        status: "fail",
        data,
      });
    }
  }
  module.exports = MobAppError;
  