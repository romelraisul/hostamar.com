UPDATE public."Customer" 
SET password = '$2a$10$reK7CYDPP45dofkBAQraNu9QVs51B9cVKf393J2I179Hq1SELvH76',
    name = 'Admin',
    stage = 'active',
    source = 'admin'
WHERE email = 'admin@hostamar.com';
