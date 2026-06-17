INSERT INTO public."Customer" (id, email, name, password, phone, stage, source, score, "createdAt", "updatedAt")
VALUES (
  'admin-001',
  'admin@hostamar.com',
  'Admin',
  '$2a$10$.Yt/PitiOpZghrva0UP2Ye3ZUIc/5BTlqlz92MTKx98icf4DcO81m',
  '+8801700000000',
  'active',
  'admin',
  100,
  NOW(),
  NOW()
);
