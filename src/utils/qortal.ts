export const createAvatarLink = (qortalName: string)=> {
    return `/arbitrary/THUMBNAIL/${encodeURIComponent(qortalName)}/qortal_avatar?async=true`
}