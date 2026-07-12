// GET /api/scim/v2/ResourceTypes
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:ListResponse'],
    totalResults: 2,
    Resources: [
      {
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:ResourceType'],
        id: 'User',
        name: 'User',
        endpoint: '/Users',
        description: 'Hostamar customer users provisioned via SCIM',
        schema: 'urn:ietf:params:scim:schemas:core:2.0:User',
        meta: { resourceType: 'ResourceType', location: '/ResourceTypes/User' },
      },
      {
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:ResourceType'],
        id: 'Group',
        name: 'Group',
        endpoint: '/Groups',
        description: 'One group per organization',
        schema: 'urn:ietf:params:scim:schemas:core:2.0:Group',
        meta: { resourceType: 'ResourceType', location: '/ResourceTypes/Group' },
      },
    ],
  })
}
