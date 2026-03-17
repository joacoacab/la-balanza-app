from core.models import Corte

CORTES_RES = [
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

CORTES_CERDO = [
    ("Bondiola",          6.0,  45, 1),
    ("Paleta",            8.0,  36, 2),
    ("Carré",             5.0,  45, 3),
    ("Costillas",         7.0,  30, 4),
    ("Lomo",              3.0,  52, 5),
    ("Matambre de cerdo", 4.0,  36, 6),
    ("Pata trasera",      5.0,  29, 7),
    ("Panceta",           6.0,  22, 8),
    ("Picada de cerdo",   4.0,   4, 9),
]

CORTES_POLLO = [
    ("Pechuga entera",   20.0,  52, 1),
    ("Suprema",          15.0,  52, 2),
    ("Muslo",            18.0,  36, 3),
    ("Pata",             12.0,  29, 4),
    ("Ala",              10.0,  22, 5),
    ("Cuarto trasero",   22.0,  30, 6),
    ("Menudos",           3.0,   4, 7),
]


def _cargar(carniceria, cortes, tipo_animal):
    for nombre, rendimiento, margen, orden in cortes:
        Corte.objects.get_or_create(
            carniceria=carniceria,
            nombre=nombre,
            tipo_animal=tipo_animal,
            defaults={
                "porcentaje_rendimiento": rendimiento,
                "margen_porcentaje": margen,
                "orden": orden,
            },
        )


def cargar_cortes_base(carniceria):
    _cargar(carniceria, CORTES_RES, "res")


def cargar_cortes_cerdo(carniceria):
    _cargar(carniceria, CORTES_CERDO, "cerdo")


def cargar_cortes_pollo(carniceria):
    _cargar(carniceria, CORTES_POLLO, "pollo")
