import io
import os

root = os.path.dirname(os.path.abspath(__file__))


def read(name):
    with open(os.path.join(root, name), encoding='utf-8') as f:
        return f.read()


parts = [
    'part1_foundation.js',
    'part2_surface.js',
    'part3_towers.js',
    'part4_substrata.js',
    'part5_lowcity.js',
    'part6_sky.js',
    'part7_controls.js',
    'part7b_post.js',
    'part8_ui.js',
]

body = '\n\n'.join(read(p) for p in parts)
film = read('part9_film.js')

# The film module needs the private scope of the city IIFE ($ , camera, ps…),
# so splice it in just before the closing wrapper rather than appending after.
close = '\n  clock = new THREE.Clock();\n  clock.start();\n  buildCity().catch(reportError);\n})();\n'
assert close in body, 'IIFE tail not found'
body = body.replace(close, '\n' + film + '\n' + close)

with open(os.path.join(root, 'city.js'), 'w', encoding='utf-8') as f:
    f.write(body)
print('assembled', len(body), 'chars')
