const TAG = Symbol('tag');

export function tag(tag, value) {
  return { [TAG]: { tag, value } };
}

export function untag(tagged) {
  return tagged[TAG];
}

export function dispatch(dispatchers, tagged) {
  const { tag, value } = untag(tagged);

  return dispatchers[tag](value);
}
