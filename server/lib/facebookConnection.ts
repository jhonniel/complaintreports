export interface FacebookConnectionRecord {
  page_id: string
  page_name: string
  access_token: string
  source?: 'oauth' | 'env'
}

export interface FacebookOauthPage {
  id: string
  name: string
  access_token: string
}

export interface FacebookOauthSessionRecord {
  id: string
  state: string
  admin_user_id: string
  pages: FacebookOauthPage[] | null
  expires_at: string
}

export class FacebookOauthSessionError extends Error {
  constructor(message = 'That Facebook login expired. Connect again.') {
    super(message)
    this.name = 'FacebookOauthSessionError'
  }
}
