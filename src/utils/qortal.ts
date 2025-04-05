export const createAvatarLink = (qortalName: string)=> {
    return `/arbitrary/THUMBNAIL/${encodeURIComponent(qortalName)}/qortal_avatar?async=true`
}

const removeTrailingSlash = (str: string) => str.replace(/\/$/, '');

export const createQortalLink = (type: 'APP' | 'WEBSITE', appName: string,  path: string) => {

      let link = 'qortal://' + type + '/' + appName 
      if(path && path.startsWith('/')){
        link = link +  removeTrailingSlash(path)
      }
      if(path && !path.startsWith('/')){
        link = link + '/' +  removeTrailingSlash(path)
      }
    return link
  };