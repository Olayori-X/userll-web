
from pathlib import Path
from PIL import Image

# Replace this with the actual path to your original logo
source = Path(r"C:\Users\PC\Downloads\Userll Marketplace Logo.png")

brand_dir = Path("public/brand")
app_dir = Path("app")

brand_dir.mkdir(parents=True, exist_ok=True)
app_dir.mkdir(parents=True, exist_ok=True)

with Image.open(source) as original:
    original = original.convert("RGBA")

    # Main logo: crop 1044x331 starting at x=107, y=435
    logo = original.crop((107, 435, 107 + 1044, 435 + 331))
    logo.save(brand_dir / "userll-logo.png")

    # Brand mark: crop 262x331 starting at x=107, y=435
    mark = original.crop((107, 435, 107 + 262, 435 + 331))
    mark.save(brand_dir / "userll-mark.png")

    # Browser icon: resize to 440px tall, centre on transparent 512x512 canvas
    icon_mark = mark.copy()
    new_width = round(icon_mark.width * 440 / icon_mark.height)
    icon_mark = icon_mark.resize((new_width, 440), Image.Resampling.LANCZOS)

    icon = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    icon.alpha_composite(
        icon_mark,
        ((512 - new_width) // 2, (512 - 440) // 2)
    )
    icon.save(app_dir / "icon.png")

    # Apple home-screen icon: resize to 140px tall and centre on cream background
    apple_mark = mark.copy()
    apple_width = round(apple_mark.width * 140 / apple_mark.height)
    apple_mark = apple_mark.resize(
        (apple_width, 140), Image.Resampling.LANCZOS
    )

    apple = Image.new("RGBA", (180, 180), "#FFF6EF")
    apple.alpha_composite(
        apple_mark,
        ((180 - apple_width) // 2, (180 - 140) // 2)
    )
    apple.save(app_dir / "apple-icon.png")

print("Brand assets created successfully!")
