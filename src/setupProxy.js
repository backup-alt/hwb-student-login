const { handleStudentAuthRequest } = require("../server/studentAuth");

module.exports = function setupProxy(app) {
  app.use("/api/student-auth", (req, res, next) => {
    handleStudentAuthRequest(req, res)
      .then((handled) => {
        if (!handled) next();
      })
      .catch(next);
  });
};
