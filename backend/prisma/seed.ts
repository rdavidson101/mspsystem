import { PrismaClient, UserRole, TicketStatus, TicketPriority, ProjectStatus, TaskStatus, TaskPriority, LeadStatus, ContractStatus, InvoiceStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@msp.local' },
    update: {},
    create: {
      email: 'admin@msp.local',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
    },
  });

  const tech = await prisma.user.upsert({
    where: { email: 'tech@msp.local' },
    update: {},
    create: {
      email: 'tech@msp.local',
      password: hashedPassword,
      firstName: 'John',
      lastName: 'Technician',
      role: UserRole.TECHNICIAN,
    },
  });

  // Create companies
  const company1 = await prisma.company.upsert({
    where: { id: 'company-1' },
    update: {},
    create: {
      id: 'company-1',
      name: 'Acme Corporation',
      domain: 'acme.com',
      industry: 'Technology',
      phone: '555-0100',
      email: 'info@acme.com',
      city: 'New York',
      state: 'NY',
      country: 'USA',
    },
  });

  // Create tickets
  await prisma.ticket.createMany({
    skipDuplicates: true,
    data: [
      {
        title: 'Server is down - critical production issue',
        description: 'Main production server is unresponsive',
        status: TicketStatus.OPEN,
        priority: TicketPriority.CRITICAL,
        companyId: company1.id,
        assignedToId: tech.id,
        createdById: admin.id,
        tags: ['server', 'production'],
      },
      {
        title: 'Email not working for finance team',
        description: 'Finance team cannot send or receive emails',
        status: TicketStatus.IN_PROGRESS,
        priority: TicketPriority.HIGH,
        companyId: company1.id,
        assignedToId: tech.id,
        createdById: admin.id,
        tags: ['email', 'finance'],
      },
    ],
  });

  // Create project
  const project = await prisma.project.create({
    data: {
      name: 'Network Infrastructure Upgrade',
      description: 'Complete network overhaul for Acme Corp',
      status: ProjectStatus.IN_PROGRESS,
      companyId: company1.id,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      budget: 50000,
      members: {
        create: [
          { userId: admin.id, role: 'OWNER' },
          { userId: tech.id, role: 'MEMBER' },
        ],
      },
    },
  });

  // Create tasks
  await prisma.task.createMany({
    skipDuplicates: true,
    data: [
      {
        title: 'Make a Website for agency',
        status: TaskStatus.COMPLETED,
        priority: TaskPriority.LOW,
        projectId: project.id,
        assignedToId: tech.id,
        createdById: admin.id,
        startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        tags: ['Important', 'Tomorrow'],
      },
      {
        title: 'Summarize your Experience',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.MEDIUM,
        projectId: project.id,
        assignedToId: tech.id,
        createdById: admin.id,
        startDate: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Make a video introduction',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        projectId: project.id,
        assignedToId: tech.id,
        createdById: admin.id,
        startDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        tags: ['Bug', 'Follow up'],
      },
      {
        title: 'Fix mimetype declarations',
        status: TaskStatus.NOT_STARTED,
        priority: TaskPriority.HIGH,
        projectId: project.id,
        createdById: admin.id,
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  // Create todos
  await prisma.todo.createMany({
    skipDuplicates: true,
    data: [
      {
        title: 'Text Inputs for Design System',
        description: 'Search for inspiration to provide a rich cont...',
        userId: admin.id,
        completed: false,
        priority: 'HIGH',
        tags: ['Today', 'To-do'],
        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Meeting with Arthur Taylor',
        description: 'Discuss the MVP version of Apex Mobile on...',
        userId: admin.id,
        completed: true,
        priority: 'MEDIUM',
        tags: ['Today', 'Meeting'],
        completedAt: new Date(),
      },
    ],
  });

  // Create lead
  await prisma.lead.create({
    data: {
      title: 'Enterprise Security Package',
      value: 25000,
      status: LeadStatus.PROPOSAL,
      companyId: company1.id,
      source: 'Website',
    },
  });

  // Create announcements
  await prisma.announcement.create({
    data: {
      title: 'System Maintenance Window',
      content: 'Scheduled maintenance on Sunday 2-4 AM EST',
      isActive: true,
    },
  });

  console.log('Seed complete!');
  console.log('Login: admin@msp.local / admin123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
