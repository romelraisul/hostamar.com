import prisma from '../lib/prisma'
import catalog from '../lib/services-catalog.json'

async function main() {
  console.log(`Seeding ${catalog.length} services...`)
  for (const s of catalog as any[]) {
    await prisma.serviceCatalog.upsert({
      where: { id: s.id },
      update: {
        name: s.name,
        nameBn: s.nameBn,
        category: s.category,
        categoryBn: s.categoryBn,
        creditCost: s.creditCost,
        dollarRange: s.dollarRange,
        benefit: s.benefit,
        benefitBn: s.benefitBn,
        perfectFor: s.perfectFor,
        perfectForBn: s.perfectForBn,
        promptTemplate: s.promptTemplate,
        model: s.model,
        inputs: s.inputs,
        icon: s.icon,
        isActive: s.isActive,
      },
      create: {
        id: s.id,
        name: s.name,
        nameBn: s.nameBn,
        category: s.category,
        categoryBn: s.categoryBn,
        creditCost: s.creditCost,
        dollarRange: s.dollarRange,
        benefit: s.benefit,
        benefitBn: s.benefitBn,
        perfectFor: s.perfectFor,
        perfectForBn: s.perfectForBn,
        promptTemplate: s.promptTemplate,
        model: s.model,
        inputs: s.inputs,
        icon: s.icon,
        isActive: s.isActive,
      },
    })
  }
  const count = await prisma.serviceCatalog.count()
  console.log(`Seed done. Total ServiceCatalog: ${count}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
