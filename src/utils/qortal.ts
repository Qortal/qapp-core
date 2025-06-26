export const createAvatarLink = (qortalName: string)=> {
    return `/arbitrary/THUMBNAIL/${encodeURIComponent(qortalName)}/qortal_avatar?async=true`
}

const removeTrailingSlash = (str: string) => str.replace(/\/$/, '');

export const createQortalLink = (
  type: 'APP' | 'WEBSITE',
  appName: string,
  path: string
) => {
  const encodedAppName = encodeURIComponent(appName);
  let link = `qortal://${type}/${encodedAppName}`;

  if (path) {
    link += path.startsWith('/')
      ? removeTrailingSlash(path)
      : '/' + removeTrailingSlash(path);
  }

  return link;
};