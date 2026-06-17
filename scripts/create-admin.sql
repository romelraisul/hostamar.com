INSERT INTO public."Customer" (id, email, name, password, phone, stage, source, score, "createdAt", "updatedAt")
VALUES (
  'admin-001',
  'admin@hostamar.com',
  'Admin',
  '$2a$10$HvAZlmHVIEJlTWfT.ict2.Tx92QBsK8fVdQIUeB3gswBNyeYhMdlO',
  '+8801700000000',
  'active',
  'admin',
  100,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;
