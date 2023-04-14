class MobAppSuccess {
    constructor(res) {
      this.res = res;
    }
  
    successResponse(data) {
      this.res.status(200).json({
        status: "success",
        data,
      });
    }
    createResponse(data) {
      this.res.status(201).json({
        status: "success",
        data,
      });
    }
  }
  module.exports = MobAppSuccess;
  