import qrcode
from PIL import Image

payments = {
    'bkash': ('bKash', '016000000000', '#E2136E'),
    'nagad': ('Nagad', '016000000001', '#F58529'),
    'rocket': ('Rocket', '016000000002', '#7B2D8E'),
    'usdt': ('USDT (BEP20)', '0x16Bfd806297feaC12FC4b8A6c95079E8aADeC858', '#2ECC71'),
}

for key, (name, value, color) in payments.items():
    qr = qrcode.QRCode(box_size=10, border=2)
    qr.add_data(value)
    qr.make(fit=True)
    img = qr.make_image(fill_color=color, back_color='white')
    path = f'/mnt/c/Users/romel/hostamar-local/public/qr/{key}.png'
    img.save(path)
    print(f'Saved {path}: {name} - {value} [{img.size}]')

print('\nAll QR codes generated!')
