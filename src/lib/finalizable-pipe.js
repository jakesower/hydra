const FINALIZED = Symbol('finalized');

export function finalizablePipe(mwGenerators) {
  const pipe = mwGenerators.reverse().reduce(
    (onion, mwGen) => {
      const step = async function(genValue, gen) {
        const { done, value: valueP } = await genValue;
        const value = await valueP;
        const pValue = await Object(value).pValue;

        return done || value[FINALIZED] ? value : step(gen.next(pValue), gen);
      };

      return async init => {
        const gen = mwGen(init, onion, pValue => ({ pValue, [FINALIZED]: true }));
        const pValue = await step(gen.next(), gen);

        return Object(pValue)[FINALIZED] ? pValue : { pValue, [FINALIZED]: false };
      };
    },
    pValue => ({ pValue, [FINALIZED]: false })
  );

  return async init => (await pipe(init)).pValue;
}
