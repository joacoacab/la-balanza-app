from core.models import Corte

CORTES_BASE = [
    ("Nalga",             8.0,  52, 1),
    ("Peceto",            3.5,  52, 2),
    ("Bife de Lomo",      2.5,  45, 3),
    ("Cuadrada",          4.0,  45, 4),
    ("Cuadril",           5.0,  39, 5),
    ("Colita de Cuadril", 2.5,  39, 6),
    ("Paleta",            6.0,  36, 7),
    ("Roast Beef",        4.0,  29, 8),
    ("Palomita",          2.5,  36, 9),
    ("Tortuguita",        2.0,  36, 10),
    ("Bife de Chorizo",   3.5,  52, 11),
    ("Bife Ancho",        3.0,  22, 12),
    ("Bife Angosto",      2.5,  22, 13),
    ("Asado Americano",   3.0,  32, 14),
    ("Tira de Asado",     7.0,  31, 15),
    ("Tira de Nalga",     3.0,  31, 16),
    ("Vacío",             5.0,  46, 17),
    ("Asado",             8.0,  32, 18),
    ("Falda",             4.0,   4, 19),
    ("Osobuco",           4.0,   0, 20),
    ("Espinazo",          3.0,   0, 21),
    ("Picada",            3.5,   4, 22),
    ("Entraña",           2.5,  52, 23),
    ("Matambre",          3.5,  36, 24),
    ("Lomo",              2.5,  52, 25),
]


def cargar_cortes_base(carniceria):
    for nombre, rendimiento, margen, orden in CORTES_BASE:
        Corte.objects.get_or_create(
            carniceria=carniceria,
            nombre=nombre,
            defaults={
                "porcentaje_rendimiento": rendimiento,
                "margen_porcentaje": margen,
                "orden": orden,
            },
        )
