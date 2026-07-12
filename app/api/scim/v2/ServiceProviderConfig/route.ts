// GET /api/scim/v2/ServiceProviderConfig
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig'],
    documentationUri: 'https://hostamar.com/docs/enterprise/sso',
    patch: { supported: false },
    bulk: { supported: false, maxOperations: 0, maxPayloadSize: 0 },
    filter: { supported: true, maxResults: 200 },
    changePassword: { supported: false },
    sort: { supported: true },
    etag: { supported: false },
    authenticationSchemes: [
      {
        name: 'OAuth Bearer Token',
        description: 'SCIM bearer token issued per organization',
        specUri: 'https://www.rfc-editor.org/rfc/rfc6750',
        type: 'oauthbearertoken',
      },
    ],
  })
}
