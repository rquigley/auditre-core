//https://github.com/vercel/next.js/blob/1f6defd4b097fb24d1fcf75a12cb77f082ed9706/packages/next-codemod/bin/cli.ts

module.exports = function (fileInfo, api) {
  const j = api.jscodeshift;

  return j(fileInfo.source)
    .find(j.CallExpression, {
      callee: {
        object: { name: 't' },
        property: { name: 'addRow' },
      },
    })
    .forEach((path) => {
      if (path.node.arguments.length === 2) {
        const secondArg = path.node.arguments[1];
        if (secondArg.type === 'ObjectExpression') {
          path.node.arguments[1] = j.objectExpression([
            j.property('init', j.identifier('style'), secondArg),
          ]);
        }
      }
    })
    .toSource();
};
