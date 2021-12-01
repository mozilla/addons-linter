module.exports = {
  create: (context) => {
    return {
      MemberExpression(node) {
        context.report(node, 'this is the message');
      },
    };
  },
};
