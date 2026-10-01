/**
 * Cocina: /cocina <25 subcomandos de recetas 100% locales, sin APIs ni DB>.
 */
import { SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/index.js';
import { Embeds } from '../../utils/embeds.js';

interface Receta {
  nombre: string;
  tiempo: string;
  dificultad: 'fácil' | 'media';
  ingredientes: readonly string[];
  pasos: readonly string[];
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function formatoReceta(r: Receta): string {
  const ing = r.ingredientes.map((i) => `• ${i}`).join('\n');
  const pasos = r.pasos.map((p, idx) => `${idx + 1}. ${p}`).join('\n');
  return `⏱️ Tiempo: ${r.tiempo}\n⭐ Dificultad: ${r.dificultad}\n\n🧂 Ingredientes:\n${ing}\n\n👩‍🍳 Pasos:\n${pasos}`;
}

const RECETAS_DESAYUNO: readonly Receta[] = [
  { nombre: 'Huevos revueltos clásicos', tiempo: '10 min', dificultad: 'fácil', ingredientes: ['4 huevos', '2 cucharadas de leche', 'Sal al gusto', '1 cucharada de mantequilla'], pasos: ['Bate los huevos con leche y sal.', 'Derrite la mantequilla en sartén a fuego medio.', 'Cocina revolviendo 3 minutos y sirve caliente.'] },
  { nombre: 'Tostadas con palta', tiempo: '10 min', dificultad: 'fácil', ingredientes: ['2 rebanadas de pan integral', '1 palta madura', 'Jugo de medio limón', 'Sal y ají en hojuelas'], pasos: ['Tuesta el pan hasta dorar.', 'Tritura la palta con limón y sal.', 'Unta la mezcla y espolvorea ají.'] },
  { nombre: 'Avena cremosa con miel', tiempo: '12 min', dificultad: 'fácil', ingredientes: ['1 taza de avena', '2 tazas de leche', '1 cucharada de miel', 'Canela al gusto', 'Medio plátano en rodajas'], pasos: ['Hierve la leche y agrega la avena.', 'Cocina 7 minutos revolviendo.', 'Sirve con miel, canela y plátano.'] },
  { nombre: 'Omelette de queso y tomate', tiempo: '12 min', dificultad: 'fácil', ingredientes: ['3 huevos', '50 g de queso rallado', 'Medio tomate picado', 'Sal y pimienta', '1 cucharadita de aceite'], pasos: ['Bate los huevos con sal y pimienta.', 'Vierte en sartén caliente con aceite.', 'Agrega queso y tomate, dobla y sirve.'] },
  { nombre: 'Yogur con granola casera', tiempo: '5 min', dificultad: 'fácil', ingredientes: ['1 taza de yogur natural', 'Media taza de granola', '1 cucharada de miel', 'Fresas picadas'], pasos: ['Coloca el yogur en un bol.', 'Agrega granola y fresas encima.', 'Rocía con miel y sirve frío.'] },
  { nombre: 'Panqueques esponjosos', tiempo: '20 min', dificultad: 'media', ingredientes: ['1 taza de harina', '1 taza de leche', '1 huevo', '2 cucharadas de azúcar', '1 cucharadita de polvo de hornear'], pasos: ['Mezcla todos los ingredientes sin grumos.', 'Cocina porciones en sartén antiadherente 2 minutos por lado.', 'Sirve con miel o mermelada.'] },
  { nombre: 'Chilaquiles verdes rápidos', tiempo: '18 min', dificultad: 'media', ingredientes: ['2 tazas de totopos', '1 taza de salsa verde', '100 g de queso fresco', 'Media cebolla en rodajas', 'Crema al gusto'], pasos: ['Calienta la salsa verde en sartén.', 'Agrega los totopos y mezcla 3 minutos.', 'Sirve con queso, cebolla y crema.'] },
  { nombre: 'Tostada francesa con canela', tiempo: '15 min', dificultad: 'fácil', ingredientes: ['4 rebanadas de pan', '2 huevos', 'Media taza de leche', '1 cucharadita de canela', 'Azúcar al gusto'], pasos: ['Bate huevos, leche y canela.', 'Remoja el pan y dora en sartén con mantequilla.', 'Espolvorea azúcar y sirve caliente.'] },
];

const RECETAS_ALMUERZO: readonly Receta[] = [
  { nombre: 'Pollo al horno con papas', tiempo: '45 min', dificultad: 'media', ingredientes: ['4 muslos de pollo', '4 papas en cubos', '2 dientes de ajo', 'Aceite de oliva', 'Sal, pimienta y orégano'], pasos: ['Sazona el pollo y las papas.', 'Hornea a 200 °C por 35 minutos.', 'Reposa 5 minutos y sirve.'] },
  { nombre: 'Arroz con pollo casero', tiempo: '40 min', dificultad: 'media', ingredientes: ['2 tazas de arroz', '500 g de pollo trozado', '1 pimiento rojo', '1 cebolla picada', '3 tazas de caldo de pollo'], pasos: ['Dora el pollo con cebolla y pimiento.', 'Agrega arroz y caldo caliente.', 'Cocina tapado 20 minutos a fuego bajo.'] },
  { nombre: 'Lentejas guisadas', tiempo: '35 min', dificultad: 'fácil', ingredientes: ['2 tazas de lentejas', '1 zanahoria picada', '1 papa picada', '1 cebolla picada', '1 litro de caldo de verduras'], pasos: ['Sofríe la cebolla y la zanahoria.', 'Agrega lentejas, papa y caldo.', 'Cocina 25 minutos hasta ablandar.'] },
  { nombre: 'Milanesas con puré', tiempo: '30 min', dificultad: 'media', ingredientes: ['4 milanesas de carne', '2 huevos batidos', 'Pan rallado', '4 papas', 'Mantequilla y leche'], pasos: ['Empana las milanesas y fríelas doradas.', 'Hierve las papas y haz puré con mantequilla.', 'Sirve las milanesas sobre el puré.'] },
  { nombre: 'Tacos de carne molida', tiempo: '25 min', dificultad: 'fácil', ingredientes: ['500 g de carne molida', '8 tortillas de maíz', '1 cebolla picada', 'Cilantro fresco', 'Salsa al gusto'], pasos: ['Cocina la carne con cebolla y sal.', 'Calienta las tortillas.', 'Arma los tacos con cilantro y salsa.'] },
  { nombre: 'Pescado al horno con limón', tiempo: '25 min', dificultad: 'fácil', ingredientes: ['4 filetes de merluza', '2 limones en rodajas', '2 dientes de ajo', 'Aceite de oliva', 'Perejil picado'], pasos: ['Sazona el pescado con ajo y limón.', 'Hornea a 190 °C por 15 minutos.', 'Decora con perejil y sirve.'] },
  { nombre: 'Guiso de verduras', tiempo: '30 min', dificultad: 'fácil', ingredientes: ['2 zapallitos picados', '2 zanahorias', '2 papas', '1 lata de tomate triturado', 'Caldo de verduras'], pasos: ['Sofríe las verduras 5 minutos.', 'Agrega tomate y caldo.', 'Cocina 20 minutos a fuego lento.'] },
  { nombre: 'Fideos con tuco', tiempo: '30 min', dificultad: 'fácil', ingredientes: ['500 g de fideos', '400 g de carne picada', '1 cebolla', '1 lata de tomate', 'Queso rallado'], pasos: ['Hierve los fideos al dente.', 'Cocina la carne con cebolla y tomate 15 minutos.', 'Mezcla con los fideos y queso.'] },
];

const RECETAS_CENA: readonly Receta[] = [
  { nombre: 'Tortilla de papas', tiempo: '30 min', dificultad: 'media', ingredientes: ['5 papas en rodajas', '1 cebolla', '5 huevos', 'Aceite de oliva', 'Sal al gusto'], pasos: ['Fríe papas y cebolla a fuego suave.', 'Mezcla con huevo batido y sal.', 'Cuaja en sartén 5 minutos por lado.'] },
  { nombre: 'Ensalada César con pollo', tiempo: '20 min', dificultad: 'fácil', ingredientes: ['2 pechugas de pollo', 'Lechuga romana', 'Crutones', 'Queso parmesano', 'Aderezo César'], pasos: ['Grilla el pollo y córtalo en tiras.', 'Mezcla con lechuga y aderezo.', 'Corona con crutones y parmesano.'] },
  { nombre: 'Sopa de zapallo', tiempo: '30 min', dificultad: 'fácil', ingredientes: ['1 kg de zapallo', '1 cebolla', '2 tazas de caldo', 'Crema de leche', 'Jengibre rallado'], pasos: ['Cocina zapallo y cebolla en caldo.', 'Licúa hasta lograr crema suave.', 'Sirve con un chorro de crema.'] },
  { nombre: 'Quesadillas de queso', tiempo: '15 min', dificultad: 'fácil', ingredientes: ['4 tortillas de trigo', '200 g de queso', '1 tomate picado', 'Cebolla de verdeo'], pasos: ['Rellena las tortillas con queso y tomate.', 'Dora en sartén 2 minutos por lado.', 'Corta en triángulos y sirve.'] },
  { nombre: 'Wok de verduras y pollo', tiempo: '20 min', dificultad: 'media', ingredientes: ['300 g de pollo en tiras', '1 pimiento', '1 zanahoria', 'Salsa de soja', 'Arroz cocido'], pasos: ['Saltea el pollo a fuego fuerte.', 'Agrega verduras y soja 5 minutos.', 'Sirve sobre arroz caliente.'] },
  { nombre: 'Pizza casera rápida', tiempo: '35 min', dificultad: 'media', ingredientes: ['1 prepizza', 'Media taza de salsa de tomate', '200 g de mozzarella', 'Orégano', 'Aceitunas'], pasos: ['Unta la salsa sobre la prepizza.', 'Cubre con queso y aceitunas.', 'Hornea 12 minutos a 220 °C.'] },
  { nombre: 'Revuelto de zapallitos', tiempo: '15 min', dificultad: 'fácil', ingredientes: ['3 zapallitos', '1 cebolla', '3 huevos', 'Queso rallado'], pasos: ['Saltea zapallitos y cebolla.', 'Agrega huevos batidos y revuelve.', 'Termina con queso rallado.'] },
  { nombre: 'Sándwich de atún', tiempo: '10 min', dificultad: 'fácil', ingredientes: ['2 latas de atún', '4 panes', 'Mayonesa', 'Lechuga y tomate', 'Jugo de limón'], pasos: ['Mezcla atún con mayonesa y limón.', 'Arma los sándwiches con verduras.', 'Tuesta levemente y sirve.'] },
];

const RECETAS_POSTRE: readonly Receta[] = [
  { nombre: 'Arroz con leche cremoso', tiempo: '35 min', dificultad: 'media', ingredientes: ['1 taza de arroz', '1 litro de leche', 'Media taza de azúcar', 'Cáscara de limón', 'Canela en polvo'], pasos: ['Cocina el arroz en leche con limón.', 'Agrega azúcar y revuelve 20 minutos.', 'Sirve frío con canela.'] },
  { nombre: 'Flan casero', tiempo: '50 min', dificultad: 'media', ingredientes: ['6 huevos', '1 litro de leche', '1 taza de azúcar', 'Esencia de vainilla', 'Media taza de azúcar para caramelo'], pasos: ['Haz caramelo y cubre el molde.', 'Bate huevos, leche, azúcar y vainilla.', 'Hornea a baño maría 40 minutos.'] },
  { nombre: 'Brownies de chocolate', tiempo: '35 min', dificultad: 'media', ingredientes: ['200 g de chocolate', '150 g de mantequilla', '3 huevos', '1 taza de azúcar', '1 taza de harina'], pasos: ['Derrite chocolate con mantequilla.', 'Mezcla con huevos, azúcar y harina.', 'Hornea 20 minutos a 180 °C.'] },
  { nombre: 'Mousse de limón', tiempo: '15 min', dificultad: 'fácil', ingredientes: ['1 lata de leche condensada', 'Media taza de jugo de limón', '1 taza de crema batida', 'Ralladura de limón'], pasos: ['Mezcla leche condensada con limón.', 'Incorpora la crema con movimientos suaves.', 'Refrigera 2 horas y decora.'] },
  { nombre: 'Galletas de avena', tiempo: '25 min', dificultad: 'fácil', ingredientes: ['2 tazas de avena', '2 plátanos maduros', 'Chips de chocolate', 'Canela', 'Miel'], pasos: ['Tritura el plátano y mezcla con avena.', 'Forma galletas en placa engrasada.', 'Hornea 12 minutos a 180 °C.'] },
  { nombre: 'Tarta de manzana', tiempo: '45 min', dificultad: 'media', ingredientes: ['1 masa de tarta', '4 manzanas', 'Media taza de azúcar', 'Canela', 'Jugo de limón'], pasos: ['Forra el molde con la masa.', 'Rellena con manzanas, azúcar y canela.', 'Hornea 30 minutos a 190 °C.'] },
  { nombre: 'Gelatina de frutas', tiempo: '20 min', dificultad: 'fácil', ingredientes: ['2 sobres de gelatina', '4 tazas de agua', 'Frutillas picadas', 'Durazno en cubos'], pasos: ['Disuelve la gelatina en agua caliente.', 'Agrega agua fría y las frutas.', 'Refrigera 3 horas hasta cuajar.'] },
  { nombre: 'Panqueques con dulce', tiempo: '20 min', dificultad: 'fácil', ingredientes: ['1 taza de harina', '1 taza de leche', '1 huevo', 'Dulce de leche', 'Azúcar impalpable'], pasos: ['Prepara panqueques finos en sartén.', 'Rellena con dulce de leche.', 'Enrolla y espolvorea azúcar.'] },
];

const RECETAS_BEBIDA: readonly Receta[] = [
  { nombre: 'Limonada fresca con menta', tiempo: '10 min', dificultad: 'fácil', ingredientes: ['4 limones', '1 litro de agua fría', 'Azúcar al gusto', 'Hojas de menta', 'Hielo'], pasos: ['Exprime los limones.', 'Mezcla con agua, azúcar y menta.', 'Sirve con mucho hielo.'] },
  { nombre: 'Chocolate caliente espeso', tiempo: '12 min', dificultad: 'fácil', ingredientes: ['1 litro de leche', '150 g de chocolate', '2 cucharadas de azúcar', 'Canela'], pasos: ['Calienta la leche sin hervir.', 'Agrega chocolate y revuelve hasta derretir.', 'Sirve con canela encima.'] },
  { nombre: 'Té helado de durazno', tiempo: '15 min', dificultad: 'fácil', ingredientes: ['4 bolsitas de té negro', '1 litro de agua', 'Jugo de durazno', 'Azúcar', 'Hielo'], pasos: ['Prepara el té y deja enfriar.', 'Mezcla con jugo y azúcar.', 'Sirve con hielo.'] },
  { nombre: 'Batido de fresa', tiempo: '8 min', dificultad: 'fácil', ingredientes: ['2 tazas de fresas', '1 taza de leche', '1 yogur natural', 'Azúcar o miel'], pasos: ['Lava y corta las fresas.', 'Licúa todo 1 minuto.', 'Sirve frío inmediatamente.'] },
  { nombre: 'Café con leche cremoso', tiempo: '8 min', dificultad: 'fácil', ingredientes: ['2 tazas de leche', '2 cucharadas de café', 'Azúcar al gusto', 'Canela'], pasos: ['Prepara el café bien cargado.', 'Calienta y espuma la leche.', 'Mezcla y espolvorea canela.'] },
  { nombre: 'Agua de jamaica', tiempo: '20 min', dificultad: 'fácil', ingredientes: ['1 taza de flor de jamaica', '1 litro de agua', 'Azúcar al gusto', 'Hielo'], pasos: ['Hierve la jamaica 10 minutos.', 'Cuela y endulza al gusto.', 'Enfría y sirve con hielo.'] },
  { nombre: 'Mate cocido con leche', tiempo: '10 min', dificultad: 'fácil', ingredientes: ['3 saquitos de mate cocido', '2 tazas de leche', '2 tazas de agua', 'Azúcar'], pasos: ['Hierve el agua con los saquitos.', 'Agrega leche caliente.', 'Endulza y sirve.'] },
  { nombre: 'Jugo de naranja y zanahoria', tiempo: '10 min', dificultad: 'fácil', ingredientes: ['4 naranjas', '2 zanahorias', 'Jengibre fresco', 'Hielo'], pasos: ['Exprime las naranjas.', 'Licúa con zanahoria y jengibre.', 'Cuela y sirve con hielo.'] },
];

const RECETAS_SNACK: readonly Receta[] = [
  { nombre: 'Nachos con queso', tiempo: '12 min', dificultad: 'fácil', ingredientes: ['1 bolsa de nachos', '200 g de queso cheddar', 'Jalapeños', 'Crema ácida'], pasos: ['Coloca nachos en placa.', 'Cubre con queso y jalapeños.', 'Gratina 5 minutos y sirve con crema.'] },
  { nombre: 'Pochoclos dulces', tiempo: '10 min', dificultad: 'fácil', ingredientes: ['Media taza de maíz', '3 cucharadas de azúcar', 'Aceite', 'Sal una pizca'], pasos: ['Calienta el aceite con el maíz.', 'Agrega azúcar cuando empiecen a explotar.', 'Agita y sirve tibios.'] },
  { nombre: 'Bruschettas de tomate', tiempo: '15 min', dificultad: 'fácil', ingredientes: ['1 baguette', '3 tomates', 'Albahaca fresca', 'Ajo y aceite de oliva'], pasos: ['Tuesta rebanadas de pan con ajo.', 'Mezcla tomate, albahaca y aceite.', 'Monta sobre el pan y sirve.'] },
  { nombre: 'Bastones de queso', tiempo: '20 min', dificultad: 'media', ingredientes: ['1 tapa de masa', '200 g de mozzarella', 'Pan rallado', '1 huevo batido'], pasos: ['Corta queso en bastones.', 'Envuelve en masa y pasa por huevo.', 'Fríe hasta dorar.'] },
  { nombre: 'Hummus con crudités', tiempo: '12 min', dificultad: 'fácil', ingredientes: ['1 lata de garbanzos', 'Jugo de limón', 'Tahini', 'Zanahoria y apio'], pasos: ['Procesa garbanzos con limón y tahini.', 'Ajusta sal y aceite.', 'Sirve con verduras en tiras.'] },
  { nombre: 'Papas bravas', tiempo: '30 min', dificultad: 'media', ingredientes: ['4 papas', 'Salsa brava', 'Alioli', 'Aceite para freír'], pasos: ['Corta y fríe las papas doradas.', 'Escurre sobre papel absorbente.', 'Sirve con salsa brava y alioli.'] },
  { nombre: 'Mini pizzas de pan', tiempo: '15 min', dificultad: 'fácil', ingredientes: ['4 panes pequeños', 'Salsa de tomate', 'Queso mozzarella', 'Orégano'], pasos: ['Abre los panes y unta salsa.', 'Cubre con queso.', 'Gratina 7 minutos.'] },
  { nombre: 'Frutos secos tostados', tiempo: '12 min', dificultad: 'fácil', ingredientes: ['2 tazas de frutos secos', '1 cucharada de miel', 'Sal', 'Pimentón'], pasos: ['Mezcla frutos con miel y sal.', 'Tuesta 8 minutos a 180 °C.', 'Deja enfriar y sirve.'] },
];

const RECETAS_ENSALADA: readonly Receta[] = [
  { nombre: 'Ensalada griega', tiempo: '12 min', dificultad: 'fácil', ingredientes: ['2 tomates', '1 pepino', '100 g de queso feta', 'Aceitunas negras', 'Aceite de oliva'], pasos: ['Corta tomates y pepino.', 'Agrega feta y aceitunas.', 'Aliña con aceite y orégano.'] },
  { nombre: 'Ensalada de atún', tiempo: '10 min', dificultad: 'fácil', ingredientes: ['2 latas de atún', 'Lechuga', '2 huevos duros', 'Tomate', 'Mayonesa'], pasos: ['Pica la lechuga y el tomate.', 'Mezcla con atún y huevo.', 'Adereza con mayonesa.'] },
  { nombre: 'Ensalada de lentejas', tiempo: '25 min', dificultad: 'fácil', ingredientes: ['2 tazas de lentejas cocidas', 'Pimiento rojo', 'Cebolla morada', 'Perejil', 'Vinagreta de limón'], pasos: ['Enfría las lentejas cocidas.', 'Pica verduras y mezcla.', 'Aliña con vinagreta.'] },
  { nombre: 'Ensalada caprese', tiempo: '10 min', dificultad: 'fácil', ingredientes: ['3 tomates', '200 g de mozzarella', 'Albahaca fresca', 'Aceite de oliva'], pasos: ['Corta tomate y queso en rodajas.', 'Alterna en plato con albahaca.', 'Rocía con aceite y sal.'] },
  { nombre: 'Ensalada de pollo y palta', tiempo: '18 min', dificultad: 'fácil', ingredientes: ['1 pechuga grillada', '1 palta', 'Lechuga mixta', 'Tomates cherry', 'Aderezo de mostaza'], pasos: ['Corta el pollo en tiras.', 'Mezcla con verduras y palta.', 'Adereza y sirve.'] },
  { nombre: 'Ensalada de arroz frío', tiempo: '20 min', dificultad: 'fácil', ingredientes: ['2 tazas de arroz cocido', 'Choclo en granos', 'Arvejas', 'Zanahoria rallada', 'Mayonesa'], pasos: ['Enfría el arroz cocido.', 'Mezcla con verduras.', 'Agrega mayonesa al gusto.'] },
  { nombre: 'Ensalada de espinaca y fresa', tiempo: '12 min', dificultad: 'fácil', ingredientes: ['200 g de espinaca', '1 taza de fresas', 'Nueces', 'Queso de cabra', 'Vinagre balsámico'], pasos: ['Lava espinaca y fresas.', 'Mezcla con nueces y queso.', 'Aliña con balsámico.'] },
  { nombre: 'Ensalada rusa clásica', tiempo: '30 min', dificultad: 'media', ingredientes: ['4 papas', '3 zanahorias', '1 taza de arvejas', 'Mayonesa', '2 huevos duros'], pasos: ['Hierve papas y zanahorias.', 'Corta en cubos con arvejas.', 'Mezcla con mayonesa y huevo.'] },
];

const RECETAS_SOPA: readonly Receta[] = [
  { nombre: 'Sopa de pollo y fideos', tiempo: '35 min', dificultad: 'fácil', ingredientes: ['1 pechuga de pollo', '100 g de fideos', '2 zanahorias', '1 cebolla', '1 litro de caldo'], pasos: ['Hierve el pollo con verduras.', 'Desmenuza el pollo.', 'Agrega fideos y cocina 8 minutos.'] },
  { nombre: 'Sopa de calabaza', tiempo: '30 min', dificultad: 'fácil', ingredientes: ['1 kg de calabaza', '1 papa', '1 cebolla', 'Caldo de verduras', 'Crema'], pasos: ['Cocina todo en caldo 20 minutos.', 'Licúa hasta cremar.', 'Sirve con crema.'] },
  { nombre: 'Sopa de tomate', tiempo: '25 min', dificultad: 'fácil', ingredientes: ['1 kg de tomates', '1 cebolla', '2 dientes de ajo', 'Albahaca', 'Caldo'], pasos: ['Sofríe ajo y cebolla.', 'Agrega tomate y caldo 15 minutos.', 'Licúa con albahaca.'] },
  { nombre: 'Caldo verde de papas', tiempo: '30 min', dificultad: 'media', ingredientes: ['5 papas', '200 g de espinaca', '1 cebolla', 'Ajo', 'Caldo'], pasos: ['Cocina papas en caldo.', 'Agrega espinaca 5 minutos.', 'Licúa rústico y sirve.'] },
  { nombre: 'Sopa de lentejas rojas', tiempo: '30 min', dificultad: 'fácil', ingredientes: ['2 tazas de lentejas rojas', '1 zanahoria', 'Comino', 'Limón', 'Caldo'], pasos: ['Cocina lentejas con zanahoria.', 'Condimenta con comino.', 'Sirve con limón.'] },
  { nombre: 'Sopa minestrone', tiempo: '40 min', dificultad: 'media', ingredientes: ['Verduras variadas', 'Porotos cocidos', 'Fideos pequeños', 'Tomate triturado', 'Caldo'], pasos: ['Sofríe las verduras.', 'Agrega tomate y caldo.', 'Suma porotos y fideos 10 minutos.'] },
  { nombre: 'Sopa de cebolla gratinada', tiempo: '45 min', dificultad: 'media', ingredientes: ['5 cebollas', '1 litro de caldo de carne', 'Pan tostado', 'Queso gruyere', 'Mantequilla'], pasos: ['Carameliza la cebolla 20 minutos.', 'Agrega caldo y cocina 15 minutos.', 'Gratina con pan y queso.'] },
  { nombre: 'Sopa de choclo cremosa', tiempo: '25 min', dificultad: 'fácil', ingredientes: ['4 choclos', '1 papa', '1 cebolla', 'Leche', 'Mantequilla'], pasos: ['Desgrana y cocina el choclo.', 'Licúa con papa y leche.', 'Calienta y sirve.'] },
];

const RECETAS_PASTA: readonly Receta[] = [
  { nombre: 'Espaguetis al pesto', tiempo: '20 min', dificultad: 'fácil', ingredientes: ['400 g de espaguetis', '2 tazas de albahaca', 'Nueces', 'Queso parmesano', 'Aceite de oliva'], pasos: ['Hierve la pasta al dente.', 'Procesa pesto con aceite.', 'Mezcla y sirve con queso.'] },
  { nombre: 'Fetuccine Alfredo', tiempo: '20 min', dificultad: 'fácil', ingredientes: ['400 g de fetuccine', '200 ml de crema', '100 g de parmesano', 'Mantequilla', 'Ajo'], pasos: ['Cocina la pasta.', 'Prepara salsa con crema y queso.', 'Mezcla y sirve caliente.'] },
  { nombre: 'Pasta boloñesa', tiempo: '35 min', dificultad: 'media', ingredientes: ['400 g de tallarines', '400 g de carne molida', 'Salsa de tomate', 'Cebolla', 'Zanahoria'], pasos: ['Dora carne con verduras.', 'Agrega salsa 20 minutos.', 'Sirve sobre la pasta.'] },
  { nombre: 'Macarrones con queso', tiempo: '25 min', dificultad: 'fácil', ingredientes: ['400 g de macarrones', '300 g de cheddar', 'Leche', 'Mantequilla', 'Harina'], pasos: ['Hierve los macarrones.', 'Prepara salsa bechamel con queso.', 'Mezcla y gratina 5 minutos.'] },
  { nombre: 'Penne arrabbiata', tiempo: '20 min', dificultad: 'fácil', ingredientes: ['400 g de penne', '400 g de tomate', 'Ají molido', 'Ajo', 'Perejil'], pasos: ['Saltea ajo con ají.', 'Agrega tomate 10 minutos.', 'Mezcla con la pasta.'] },
  { nombre: 'Lasaña de carne', tiempo: '50 min', dificultad: 'media', ingredientes: ['12 láminas de lasaña', '500 g de carne', 'Salsa bechamel', 'Queso mozzarella', 'Salsa de tomate'], pasos: ['Arma capas de pasta, carne y salsas.', 'Cubre con mozzarella.', 'Hornea 30 minutos.'] },
  { nombre: 'Ñoquis con manteca y salvia', tiempo: '30 min', dificultad: 'media', ingredientes: ['1 kg de ñoquis', '100 g de mantequilla', 'Hojas de salvia', 'Parmesano'], pasos: ['Hierve los ñoquis hasta que floten.', 'Dora mantequilla con salvia.', 'Mezcla y sirve con queso.'] },
  { nombre: 'Pasta primavera', tiempo: '22 min', dificultad: 'fácil', ingredientes: ['400 g de fusilli', 'Zapallito', 'Cherry', 'Zanahoria', 'Aceite de oliva'], pasos: ['Saltea las verduras.', 'Hierve la pasta.', 'Mezcla todo con aceite.'] },
];

const RECETAS_ARROZ: readonly Receta[] = [
  { nombre: 'Arroz blanco perfecto', tiempo: '20 min', dificultad: 'fácil', ingredientes: ['2 tazas de arroz', '3 tazas de agua', 'Sal', 'Aceite'], pasos: ['Sofríe el arroz 2 minutos.', 'Agrega agua y sal.', 'Cocina tapado 15 minutos.'] },
  { nombre: 'Arroz frito chino', tiempo: '20 min', dificultad: 'media', ingredientes: ['3 tazas de arroz cocido frío', '2 huevos', 'Cebolla de verdeo', 'Salsa de soja', 'Zanahoria'], pasos: ['Revuelve los huevos en wok.', 'Agrega arroz y verduras.', 'Sazona con soja.'] },
  { nombre: 'Risotto de champiñones', tiempo: '35 min', dificultad: 'media', ingredientes: ['2 tazas de arroz arbóreo', '300 g de champiñones', 'Caldo caliente', 'Parmesano', 'Cebolla'], pasos: ['Sofríe cebolla y arroz.', 'Agrega caldo de a poco 20 minutos.', 'Termina con champiñones y queso.'] },
  { nombre: 'Arroz con verduras', tiempo: '25 min', dificultad: 'fácil', ingredientes: ['2 tazas de arroz', 'Pimiento', 'Choclo', 'Arvejas', 'Caldo'], pasos: ['Saltea las verduras.', 'Agrega arroz y caldo.', 'Cocina tapado 18 minutos.'] },
  { nombre: 'Arroz con leche salado', tiempo: '25 min', dificultad: 'fácil', ingredientes: ['2 tazas de arroz', '1 cebolla', 'Ajo', 'Queso cremoso', 'Caldo'], pasos: ['Cocina arroz en caldo.', 'Agrega queso cremoso.', 'Sirve bien caliente.'] },
  { nombre: 'Paella de verduras', tiempo: '45 min', dificultad: 'media', ingredientes: ['2 tazas de arroz bomba', 'Pimiento rojo', 'Chauchas', 'Pimentón', 'Caldo de verduras'], pasos: ['Sofríe verduras con pimentón.', 'Agrega arroz y caldo.', 'Cocina 20 minutos sin revolver.'] },
  { nombre: 'Arroz integral con palta', tiempo: '40 min', dificultad: 'fácil', ingredientes: ['2 tazas de arroz integral', '1 palta', 'Limón', 'Cilantro', 'Sal'], pasos: ['Hierve el arroz 30 minutos.', 'Corta palta con limón.', 'Mezcla y sirve tibio.'] },
  { nombre: 'Arroz chaufa peruano', tiempo: '25 min', dificultad: 'media', ingredientes: ['3 tazas de arroz cocido', '300 g de pollo', 'Tortilla de huevo', 'Salsa de soja', 'Jengibre'], pasos: ['Saltea pollo con jengibre.', 'Agrega arroz y soja.', 'Mezcla con huevo en tiras.'] },
];

const RECETAS_POLLO: readonly Receta[] = [
  { nombre: 'Pollo al limón', tiempo: '30 min', dificultad: 'fácil', ingredientes: ['4 pechugas', '2 limones', 'Ajo', 'Aceite de oliva', 'Orégano'], pasos: ['Marina el pollo con limón 10 minutos.', 'Dora en sartén 6 minutos por lado.', 'Sirve con jugo de cocción.'] },
  { nombre: 'Pollo a la mostaza', tiempo: '35 min', dificultad: 'media', ingredientes: ['6 muslos', '3 cucharadas de mostaza', 'Crema', 'Cebolla', 'Caldo'], pasos: ['Dora el pollo.', 'Agrega cebolla, mostaza y caldo.', 'Termina con crema 10 minutos.'] },
  { nombre: 'Alitas picantes', tiempo: '40 min', dificultad: 'media', ingredientes: ['1 kg de alitas', 'Salsa picante', 'Mantequilla', 'Ajo en polvo', 'Apio'], pasos: ['Hornea alitas 30 minutos.', 'Mezcla salsa con mantequilla.', 'Baña las alitas y sirve.'] },
  { nombre: 'Pollo teriyaki', tiempo: '25 min', dificultad: 'fácil', ingredientes: ['500 g de pollo', 'Salsa teriyaki', 'Sésamo', 'Arroz blanco', 'Cebolla de verdeo'], pasos: ['Dora el pollo en cubos.', 'Agrega teriyaki y reduce.', 'Sirve con arroz y sésamo.'] },
  { nombre: 'Pechugas rellenas', tiempo: '40 min', dificultad: 'media', ingredientes: ['4 pechugas', 'Espinaca', 'Queso crema', 'Ajo', 'Pan rallado'], pasos: ['Abre y rellena las pechugas.', 'Cierra con palillos.', 'Hornea 25 minutos.'] },
  { nombre: 'Pollo frito crocante', tiempo: '40 min', dificultad: 'media', ingredientes: ['8 piezas de pollo', 'Harina', 'Huevo', 'Pan rallado', 'Especias'], pasos: ['Pasa por harina, huevo y pan.', 'Fríe en aceite caliente.', 'Escurre y sirve.'] },
  { nombre: 'Guiso de pollo', tiempo: '45 min', dificultad: 'media', ingredientes: ['1 pollo trozado', 'Papas', 'Zanahorias', 'Tomate', 'Caldo'], pasos: ['Dora el pollo.', 'Agrega verduras y caldo.', 'Cocina 30 minutos.'] },
  { nombre: 'Pollo con miel y ajo', tiempo: '25 min', dificultad: 'fácil', ingredientes: ['500 g de muslos', '3 cucharadas de miel', '4 dientes de ajo', 'Soja', 'Arroz'], pasos: ['Dora el pollo con ajo.', 'Agrega miel y soja.', 'Reduce y sirve con arroz.'] },
];

const RECETAS_PESCADO: readonly Receta[] = [
  { nombre: 'Merluza a la plancha', tiempo: '15 min', dificultad: 'fácil', ingredientes: ['4 filetes de merluza', 'Limón', 'Ajo', 'Perejil', 'Aceite'], pasos: ['Sazona los filetes.', 'Cocina 3 minutos por lado.', 'Sirve con limón y perejil.'] },
  { nombre: 'Salmón al horno', tiempo: '20 min', dificultad: 'fácil', ingredientes: ['4 filetes de salmón', 'Miel', 'Mostaza', 'Limón', 'Eneldo'], pasos: ['Mezcla miel con mostaza.', 'Unta el salmón.', 'Hornea 12 minutos.'] },
  { nombre: 'Ceviche clásico', tiempo: '25 min', dificultad: 'media', ingredientes: ['500 g de pescado blanco', 'Jugo de 6 limones', 'Cebolla morada', 'Cilantro', 'Ají'], pasos: ['Corta el pescado en cubos.', 'Marina en limón 15 minutos.', 'Mezcla con cebolla y cilantro.'] },
  { nombre: 'Atún sellado', tiempo: '12 min', dificultad: 'media', ingredientes: ['4 medallones de atún', 'Sésamo', 'Soja', 'Jengibre', 'Limón'], pasos: ['Pasa el atún por sésamo.', 'Sella 1 minuto por lado.', 'Sirve con soja.'] },
  { nombre: 'Trucha con almendras', tiempo: '25 min', dificultad: 'media', ingredientes: ['4 truchas', 'Almendras laminadas', 'Mantequilla', 'Limón', 'Perejil'], pasos: ['Dora las almendras en mantequilla.', 'Cocina las truchas 4 minutos por lado.', 'Cubre con almendras.'] },
  { nombre: 'Tacos de pescado', tiempo: '30 min', dificultad: 'media', ingredientes: ['500 g de pescado', 'Tortillas', 'Repollo', 'Crema', 'Limón'], pasos: ['Reboza y fríe el pescado.', 'Arma tacos con repollo.', 'Agrega crema y limón.'] },
  { nombre: 'Bacalao con papas', tiempo: '40 min', dificultad: 'media', ingredientes: ['600 g de bacalao', '4 papas', 'Aceitunas', 'Tomate', 'Aceite'], pasos: ['Hierve las papas.', 'Cocina bacalao con tomate.', 'Sirve con aceitunas.'] },
  { nombre: 'Sardinas al horno', tiempo: '18 min', dificultad: 'fácil', ingredientes: ['12 sardinas', 'Pan rallado', 'Ajo', 'Perejil', 'Limón'], pasos: ['Limpia las sardinas.', 'Cubre con pan, ajo y perejil.', 'Hornea 10 minutos.'] },
];

const RECETAS_CARNE: readonly Receta[] = [
  { nombre: 'Bife a la plancha', tiempo: '15 min', dificultad: 'fácil', ingredientes: ['4 bifes', 'Sal gruesa', 'Pimienta', 'Aceite', 'Mantequilla'], pasos: ['Sazona los bifes.', 'Sella 3 minutos por lado.', 'Reposa y sirve.'] },
  { nombre: 'Asado al horno', tiempo: '60 min', dificultad: 'media', ingredientes: ['1 kg de asado', 'Papas', 'Ajo', 'Romero', 'Sal'], pasos: ['Sazona la carne.', 'Hornea 50 minutos a 180 °C.', 'Acompaña con papas.'] },
  { nombre: 'Albóndigas en salsa', tiempo: '35 min', dificultad: 'media', ingredientes: ['500 g de carne molida', 'Pan rallado', 'Huevo', 'Salsa de tomate', 'Perejil'], pasos: ['Forma albóndigas.', 'Dora en sartén.', 'Cocina en salsa 15 minutos.'] },
  { nombre: 'Lomo saltado', tiempo: '25 min', dificultad: 'media', ingredientes: ['500 g de lomo', 'Papas fritas', 'Cebolla', 'Tomate', 'Salsa de soja'], pasos: ['Saltea el lomo a fuego fuerte.', 'Agrega cebolla y tomate.', 'Mezcla con papas y soja.'] },
  { nombre: 'Vacío a la provenzal', tiempo: '40 min', dificultad: 'media', ingredientes: ['800 g de vacío', 'Ajo', 'Perejil', 'Limón', 'Aceite'], pasos: ['Grilla el vacío.', 'Prepara provenzal con ajo.', 'Sirve con limón.'] },
  { nombre: 'Estofado de carne', tiempo: '60 min', dificultad: 'media', ingredientes: ['700 g de carne', 'Papas', 'Zanahoria', 'Vino tinto', 'Caldo'], pasos: ['Dora la carne.', 'Agrega verduras y vino.', 'Cocina 45 minutos lento.'] },
  { nombre: 'Hamburguesas caseras', tiempo: '25 min', dificultad: 'fácil', ingredientes: ['600 g de carne molida', 'Pan de hamburguesa', 'Queso', 'Lechuga', 'Tomate'], pasos: ['Forma y sazona las hamburguesas.', 'Grilla 4 minutos por lado.', 'Arma con queso y verduras.'] },
  { nombre: 'Matambre a la pizza', tiempo: '45 min', dificultad: 'media', ingredientes: ['1 matambre', 'Salsa de tomate', 'Mozzarella', 'Orégano', 'Aceitunas'], pasos: ['Hierve el matambre 20 minutos.', 'Cubre con salsa y queso.', 'Gratina al horno.'] },
];

const RECETAS_VEGANO: readonly Receta[] = [
  { nombre: 'Curry de garbanzos', tiempo: '30 min', dificultad: 'fácil', ingredientes: ['2 tazas de garbanzos cocidos', 'Leche de coco', 'Curry en polvo', 'Cebolla', 'Arroz'], pasos: ['Sofríe cebolla con curry.', 'Agrega garbanzos y coco.', 'Sirve con arroz.'] },
  { nombre: 'Tofu salteado', tiempo: '20 min', dificultad: 'fácil', ingredientes: ['400 g de tofu firme', 'Salsa de soja', 'Verduras', 'Jengibre', 'Sésamo'], pasos: ['Dora el tofu en cubos.', 'Agrega verduras y soja.', 'Termina con sésamo.'] },
  { nombre: 'Lentejas al curry', tiempo: '30 min', dificultad: 'fácil', ingredientes: ['2 tazas de lentejas', 'Tomate', 'Curry', 'Coco rallado', 'Cilantro'], pasos: ['Cocina las lentejas.', 'Agrega tomate y curry.', 'Decora con cilantro.'] },
  { nombre: 'Ensalada de quinoa', tiempo: '25 min', dificultad: 'fácil', ingredientes: ['1 taza de quinoa', 'Palta', 'Tomate cherry', 'Limón', 'Aceite'], pasos: ['Hierve la quinoa 15 minutos.', 'Mezcla con verduras.', 'Aliña con limón.'] },
  { nombre: 'Hamburguesa de porotos', tiempo: '30 min', dificultad: 'media', ingredientes: ['2 tazas de porotos negros', 'Avena', 'Cebolla', 'Comino', 'Pan integral'], pasos: ['Procesa porotos con avena.', 'Forma hamburguesas.', 'Grilla 4 minutos por lado.'] },
  { nombre: 'Fideos de arroz con verduras', tiempo: '20 min', dificultad: 'fácil', ingredientes: ['200 g de fideos de arroz', 'Brócoli', 'Zanahoria', 'Soja', 'Maní'], pasos: ['Hidrata los fideos.', 'Saltea las verduras.', 'Mezcla con soja y maní.'] },
  { nombre: 'Tacos veganos', tiempo: '25 min', dificultad: 'fácil', ingredientes: ['Tortillas de maíz', 'Porotos', 'Palta', 'Repollo morado', 'Salsa'], pasos: ['Calienta porotos con especias.', 'Arma tacos con verduras.', 'Agrega palta y salsa.'] },
  { nombre: 'Leche dorada de avena', tiempo: '10 min', dificultad: 'fácil', ingredientes: ['2 tazas de leche de avena', 'Cúrcuma', 'Canela', 'Miel vegana', 'Jengibre'], pasos: ['Calienta la leche.', 'Agrega especias.', 'Endulza y sirve.'] },
];

const RECETAS_VEGETARIANO: readonly Receta[] = [
  { nombre: 'Tarta de verduras', tiempo: '40 min', dificultad: 'media', ingredientes: ['1 masa', 'Zapallito', 'Berenjena', 'Queso', 'Huevo batido'], pasos: ['Saltea las verduras.', 'Rellena la masa.', 'Hornea 25 minutos.'] },
  { nombre: 'Canelones de ricota', tiempo: '45 min', dificultad: 'media', ingredientes: ['12 canelones', '500 g de ricota', 'Espinaca', 'Salsa de tomate', 'Queso'], pasos: ['Rellena los canelones.', 'Cubre con salsa.', 'Hornea 25 minutos.'] },
  { nombre: 'Tortilla de espinaca', tiempo: '25 min', dificultad: 'fácil', ingredientes: ['300 g de espinaca', '5 huevos', 'Cebolla', 'Queso', 'Sal'], pasos: ['Saltea espinaca y cebolla.', 'Mezcla con huevo.', 'Cuaja en sartén.'] },
  { nombre: 'Pizza margarita', tiempo: '35 min', dificultad: 'media', ingredientes: ['1 prepizza', 'Salsa de tomate', 'Mozzarella', 'Albahaca', 'Aceite'], pasos: ['Unta la salsa.', 'Agrega mozzarella.', 'Hornea y decora con albahaca.'] },
  { nombre: 'Ratatouille al horno', tiempo: '45 min', dificultad: 'media', ingredientes: ['Zapallito', 'Berenjena', 'Tomate', 'Pimiento', 'Hierbas'], pasos: ['Corta todo en rodajas.', 'Ordena en fuente con aceite.', 'Hornea 30 minutos.'] },
  { nombre: 'Ñoquis de papa', tiempo: '40 min', dificultad: 'media', ingredientes: ['1 kg de papas', '300 g de harina', 'Huevo', 'Sal', 'Salsa'], pasos: ['Haz puré y mezcla con harina.', 'Forma los ñoquis.', 'Hierve y sirve con salsa.'] },
  { nombre: 'Ensalada de burrata', tiempo: '12 min', dificultad: 'fácil', ingredientes: ['1 burrata', 'Tomates cherry', 'Rúcula', 'Pesto', 'Pan tostado'], pasos: ['Coloca rúcula y tomates.', 'Agrega la burrata.', 'Rocía con pesto.'] },
  { nombre: 'Frittata de hongos', tiempo: '25 min', dificultad: 'fácil', ingredientes: ['6 huevos', '200 g de champiñones', 'Cebolla', 'Queso', 'Perejil'], pasos: ['Saltea hongos y cebolla.', 'Agrega huevos batidos.', 'Cocina tapado 10 minutos.'] },
];

const RECETAS_DESAYUNO_DULCE: readonly Receta[] = [
  { nombre: 'Panqueques con miel', tiempo: '20 min', dificultad: 'fácil', ingredientes: ['1 taza de harina', '1 huevo', '1 taza de leche', 'Miel', 'Mantequilla'], pasos: ['Mezcla harina, huevo y leche.', 'Cocina panqueques finos.', 'Sirve con miel.'] },
  { nombre: 'Waffles crujientes', tiempo: '25 min', dificultad: 'media', ingredientes: ['2 tazas de harina', '2 huevos', '1 taza de leche', 'Azúcar', 'Vainilla'], pasos: ['Bate la mezcla sin grumos.', 'Cocina en wafflera 4 minutos.', 'Sirve con frutas.'] },
  { nombre: 'Tostadas con mermelada', tiempo: '8 min', dificultad: 'fácil', ingredientes: ['4 rebanadas de pan', 'Mermelada de frutilla', 'Mantequilla', 'Azúcar impalpable'], pasos: ['Tuesta el pan.', 'Unta mantequilla.', 'Agrega mermelada.'] },
  { nombre: 'Bowl de frutas y yogur', tiempo: '10 min', dificultad: 'fácil', ingredientes: ['Yogur griego', 'Plátano', 'Fresas', 'Granola', 'Miel'], pasos: ['Corta las frutas.', 'Coloca yogur en bol.', 'Decora con granola y miel.'] },
  { nombre: 'Churros con azúcar', tiempo: '30 min', dificultad: 'media', ingredientes: ['1 taza de harina', '1 taza de agua', 'Azúcar', 'Canela', 'Aceite'], pasos: ['Hierve agua y agrega harina.', 'Forma churros con manga.', 'Fríe y pasa por azúcar.'] },
  { nombre: 'Medialunas de manteca', tiempo: '60 min', dificultad: 'media', ingredientes: ['500 g de harina', '200 g de mantequilla', 'Azúcar', 'Levadura', 'Leche'], pasos: ['Amasa y deja leudar 30 minutos.', 'Forma medialunas.', 'Hornea 15 minutos.'] },
  { nombre: 'Licuado de banana dulce', tiempo: '8 min', dificultad: 'fácil', ingredientes: ['2 bananas', '1 taza de leche', 'Azúcar', 'Vainilla', 'Hielo'], pasos: ['Pela las bananas.', 'Licúa todo 1 minuto.', 'Sirve bien frío.'] },
  { nombre: 'Arroz con leche dulce', tiempo: '35 min', dificultad: 'fácil', ingredientes: ['1 taza de arroz', '1 litro de leche', 'Azúcar', 'Vainilla', 'Canela'], pasos: ['Cocina arroz en leche.', 'Agrega azúcar y vainilla.', 'Sirve con canela.'] },
];

const RECETAS_MERIENDA: readonly Receta[] = [
  { nombre: 'Bizcochuelo de vainilla', tiempo: '40 min', dificultad: 'media', ingredientes: ['3 huevos', '1 taza de azúcar', '2 tazas de harina', 'Leche', 'Vainilla'], pasos: ['Bate huevos con azúcar.', 'Agrega harina y leche.', 'Hornea 30 minutos.'] },
  { nombre: 'Tostado de jamón y queso', tiempo: '10 min', dificultad: 'fácil', ingredientes: ['2 panes', 'Jamón', 'Queso', 'Mantequilla'], pasos: ['Arma el sándwich.', 'Unta mantequilla fuera.', 'Tuesta hasta derretir.'] },
  { nombre: 'Facturas con crema', tiempo: '50 min', dificultad: 'media', ingredientes: ['500 g de harina', 'Crema pastelera', 'Azúcar', 'Levadura', 'Leche'], pasos: ['Amasa y leuda 30 minutos.', 'Forma facturas con crema.', 'Hornea 15 minutos.'] },
  { nombre: 'Galletas de manteca', tiempo: '25 min', dificultad: 'fácil', ingredientes: ['200 g de mantequilla', '1 taza de azúcar', '2 tazas de harina', 'Vainilla'], pasos: ['Bate mantequilla con azúcar.', 'Agrega harina.', 'Hornea 12 minutos.'] },
  { nombre: 'Leche chocolatada', tiempo: '8 min', dificultad: 'fácil', ingredientes: ['2 tazas de leche', 'Cacao', 'Azúcar', 'Vainilla'], pasos: ['Calienta la leche.', 'Agrega cacao y azúcar.', 'Sirve caliente.'] },
  { nombre: 'Scones de queso', tiempo: '25 min', dificultad: 'fácil', ingredientes: ['2 tazas de harina', 'Queso rallado', 'Mantequilla', 'Leche', 'Polvo de hornear'], pasos: ['Mezcla todo hasta arenado.', 'Corta círculos.', 'Hornea 12 minutos.'] },
  { nombre: 'Budín de limón', tiempo: '45 min', dificultad: 'media', ingredientes: ['3 huevos', '200 g de azúcar', '250 g de harina', 'Limón', 'Aceite'], pasos: ['Bate huevos con azúcar.', 'Agrega harina y limón.', 'Hornea 35 minutos.'] },
  { nombre: 'Pan con mantequilla y café', tiempo: '8 min', dificultad: 'fácil', ingredientes: ['Pan casero', 'Mantequilla', 'Café con leche', 'Azúcar'], pasos: ['Tuesta el pan.', 'Unta mantequilla.', 'Acompaña con café.'] },
];

const RECETAS_PAN: readonly Receta[] = [
  { nombre: 'Pan casero básico', tiempo: '90 min', dificultad: 'media', ingredientes: ['500 g de harina', '300 ml de agua', 'Levadura', 'Sal', 'Aceite'], pasos: ['Amasa 10 minutos.', 'Leuda 1 hora.', 'Hornea 25 minutos.'] },
  { nombre: 'Pan integral', tiempo: '90 min', dificultad: 'media', ingredientes: ['500 g de harina integral', 'Agua tibia', 'Levadura', 'Miel', 'Sal'], pasos: ['Mezcla y amasa.', 'Leuda 1 hora.', 'Hornea 30 minutos.'] },
  { nombre: 'Focaccia de romero', tiempo: '70 min', dificultad: 'media', ingredientes: ['500 g de harina', 'Aceite de oliva', 'Romero', 'Sal gruesa', 'Levadura'], pasos: ['Amasa y leuda 45 minutos.', 'Estira y marca hoyos.', 'Hornea con romero 20 minutos.'] },
  { nombre: 'Pan de leche', tiempo: '60 min', dificultad: 'media', ingredientes: ['500 g de harina', '250 ml de leche', 'Azúcar', 'Mantequilla', 'Levadura'], pasos: ['Amasa con leche tibia.', 'Forma bollos.', 'Hornea 18 minutos.'] },
  { nombre: 'Baguettes crujientes', tiempo: '80 min', dificultad: 'media', ingredientes: ['500 g de harina', '350 ml de agua', 'Levadura', 'Sal'], pasos: ['Amasa y leuda 1 hora.', 'Forma baguettes.', 'Hornea con vapor 20 minutos.'] },
  { nombre: 'Pan de ajo', tiempo: '20 min', dificultad: 'fácil', ingredientes: ['1 pan', 'Mantequilla', 'Ajo', 'Perejil'], pasos: ['Mezcla mantequilla con ajo.', 'Unta el pan.', 'Hornea 10 minutos.'] },
  { nombre: 'Pan pita', tiempo: '50 min', dificultad: 'media', ingredientes: ['400 g de harina', 'Agua', 'Aceite', 'Levadura', 'Sal'], pasos: ['Amasa y leuda 30 minutos.', 'Estira discos finos.', 'Cocina 2 minutos por lado.'] },
  { nombre: 'Pan de banana', tiempo: '55 min', dificultad: 'fácil', ingredientes: ['3 bananas', '2 tazas de harina', 'Azúcar', 'Huevos', 'Polvo de hornear'], pasos: ['Tritura las bananas.', 'Mezcla con el resto.', 'Hornea 40 minutos.'] },
];

const RECETAS_SALSA: readonly Receta[] = [
  { nombre: 'Salsa blanca bechamel', tiempo: '15 min', dificultad: 'fácil', ingredientes: ['50 g de mantequilla', '50 g de harina', '500 ml de leche', 'Sal', 'Nuez moscada'], pasos: ['Derrite mantequilla.', 'Agrega harina 1 minuto.', 'Vierte leche revolviendo.'] },
  { nombre: 'Salsa de tomate casera', tiempo: '25 min', dificultad: 'fácil', ingredientes: ['1 kg de tomate', 'Ajo', 'Cebolla', 'Albahaca', 'Aceite'], pasos: ['Sofríe ajo y cebolla.', 'Agrega tomate 15 minutos.', 'Licúa con albahaca.'] },
  { nombre: 'Salsa pesto', tiempo: '10 min', dificultad: 'fácil', ingredientes: ['2 tazas de albahaca', 'Nueces', 'Parmesano', 'Ajo', 'Aceite'], pasos: ['Procesa todo junto.', 'Agrega aceite en hilo.', 'Guarda en frasco.'] },
  { nombre: 'Salsa barbacoa', tiempo: '20 min', dificultad: 'fácil', ingredientes: ['Kétchup', 'Azúcar rubia', 'Vinagre', 'Mostaza', 'Pimentón'], pasos: ['Mezcla todo en olla.', 'Cocina 10 minutos.', 'Deja enfriar.'] },
  { nombre: 'Salsa criolla', tiempo: '12 min', dificultad: 'fácil', ingredientes: ['Tomate', 'Cebolla', 'Pimiento', 'Vinagre', 'Aceite'], pasos: ['Pica todo en cubos.', 'Mezcla con vinagre.', 'Reposa 10 minutos.'] },
  { nombre: 'Chimichurri', tiempo: '10 min', dificultad: 'fácil', ingredientes: ['Perejil', 'Ajo', 'Orégano', 'Vinagre', 'Aceite'], pasos: ['Pica perejil y ajo.', 'Mezcla con especias.', 'Reposa 1 hora.'] },
  { nombre: 'Salsa de queso', tiempo: '12 min', dificultad: 'fácil', ingredientes: ['200 g de cheddar', 'Crema', 'Mantequilla', 'Harina', 'Leche'], pasos: ['Haz roux con mantequilla.', 'Agrega leche y queso.', 'Revuelve hasta fundir.'] },
  { nombre: 'Guacamole', tiempo: '10 min', dificultad: 'fácil', ingredientes: ['2 paltas', 'Tomate', 'Cebolla', 'Limón', 'Cilantro'], pasos: ['Tritura las paltas.', 'Mezcla con el resto.', 'Sirve con limón.'] },
];

const RECETAS_GUARNICION: readonly Receta[] = [
  { nombre: 'Puré de papas', tiempo: '25 min', dificultad: 'fácil', ingredientes: ['1 kg de papas', 'Mantequilla', 'Leche caliente', 'Sal', 'Nuez moscada'], pasos: ['Hierve las papas.', 'Pisa con mantequilla.', 'Agrega leche y bate.'] },
  { nombre: 'Papas al horno', tiempo: '35 min', dificultad: 'fácil', ingredientes: ['1 kg de papas', 'Aceite', 'Romero', 'Ajo', 'Sal'], pasos: ['Corta en cuñas.', 'Mezcla con aceite.', 'Hornea 30 minutos.'] },
  { nombre: 'Arroz pilaf', tiempo: '22 min', dificultad: 'fácil', ingredientes: ['2 tazas de arroz', 'Cebolla', 'Caldo', 'Mantequilla'], pasos: ['Sofríe cebolla.', 'Agrega arroz y caldo.', 'Cocina tapado.'] },
  { nombre: 'Verduras grilladas', tiempo: '20 min', dificultad: 'fácil', ingredientes: ['Zapallito', 'Berenjena', 'Pimiento', 'Aceite', 'Sal'], pasos: ['Corta en láminas.', 'Grilla 3 minutos por lado.', 'Sirve con aceite.'] },
  { nombre: 'Ensalada de papas', tiempo: '25 min', dificultad: 'fácil', ingredientes: ['1 kg de papas', 'Mayonesa', 'Huevo duro', 'Perejil', 'Mostaza'], pasos: ['Hierve y corta las papas.', 'Mezcla con el resto.', 'Enfría 1 hora.'] },
  { nombre: 'Choclo con mantequilla', tiempo: '15 min', dificultad: 'fácil', ingredientes: ['4 choclos', 'Mantequilla', 'Sal', 'Limón'], pasos: ['Hierve los choclos.', 'Unta mantequilla.', 'Sirve con sal y limón.'] },
  { nombre: 'Boniatos asados', tiempo: '35 min', dificultad: 'fácil', ingredientes: ['4 boniatos', 'Miel', 'Canela', 'Aceite'], pasos: ['Corta en rodajas.', 'Mezcla con miel.', 'Hornea 25 minutos.'] },
  { nombre: 'Hongos salteados', tiempo: '12 min', dificultad: 'fácil', ingredientes: ['400 g de champiñones', 'Ajo', 'Perejil', 'Aceite'], pasos: ['Lamina los hongos.', 'Saltea con ajo.', 'Termina con perejil.'] },
];

const RECETAS_TORTA: readonly Receta[] = [
  { nombre: 'Torta de vainilla', tiempo: '45 min', dificultad: 'media', ingredientes: ['3 huevos', '200 g de azúcar', '250 g de harina', 'Leche', 'Vainilla'], pasos: ['Bate huevos y azúcar.', 'Agrega harina y leche.', 'Hornea 30 minutos.'] },
  { nombre: 'Torta de chocolate', tiempo: '50 min', dificultad: 'media', ingredientes: ['3 huevos', '200 g de azúcar', 'Cacao', 'Harina', 'Aceite'], pasos: ['Mezcla secos y húmedos.', 'Vierte en molde.', 'Hornea 35 minutos.'] },
  { nombre: 'Torta de zanahoria', tiempo: '50 min', dificultad: 'media', ingredientes: ['3 zanahorias ralladas', '3 huevos', 'Azúcar', 'Harina', 'Nueces'], pasos: ['Bate huevos con azúcar.', 'Agrega zanahoria y harina.', 'Hornea 35 minutos.'] },
  { nombre: 'Torta de limón', tiempo: '45 min', dificultad: 'media', ingredientes: ['3 huevos', 'Azúcar', 'Harina', 'Limón', 'Polvo de hornear'], pasos: ['Bate todo junto.', 'Vierte en molde.', 'Hornea 30 minutos.'] },
  { nombre: 'Torta marmolada', tiempo: '50 min', dificultad: 'media', ingredientes: ['4 huevos', 'Azúcar', 'Harina', 'Cacao', 'Vainilla'], pasos: ['Prepara mezcla de vainilla.', 'Separa mitad con cacao.', 'Vierte alternando y hornea.'] },
  { nombre: 'Torta de naranja', tiempo: '45 min', dificultad: 'fácil', ingredientes: ['2 naranjas', '3 huevos', 'Azúcar', 'Harina', 'Aceite'], pasos: ['Licúa naranjas con huevos.', 'Mezcla con harina.', 'Hornea 30 minutos.'] },
  { nombre: 'Torta de manzana invertida', tiempo: '55 min', dificultad: 'media', ingredientes: ['4 manzanas', 'Azúcar', 'Mantequilla', 'Huevos', 'Harina'], pasos: ['Carameliza manzanas en molde.', 'Vierte la mezcla.', 'Hornea y desmolda.'] },
  { nombre: 'Torta de coco', tiempo: '45 min', dificultad: 'fácil', ingredientes: ['3 huevos', 'Azúcar', 'Harina', 'Coco rallado', 'Leche'], pasos: ['Bate huevos con azúcar.', 'Agrega coco y harina.', 'Hornea 30 minutos.'] },
];

const RECETAS_GALLETA: readonly Receta[] = [
  { nombre: 'Galletas de vainilla', tiempo: '25 min', dificultad: 'fácil', ingredientes: ['200 g de mantequilla', 'Azúcar', 'Harina', 'Huevo', 'Vainilla'], pasos: ['Bate mantequilla y azúcar.', 'Agrega huevo y harina.', 'Hornea 12 minutos.'] },
  { nombre: 'Galletas de chocolate', tiempo: '25 min', dificultad: 'fácil', ingredientes: ['Mantequilla', 'Azúcar rubia', 'Cacao', 'Harina', 'Chips'], pasos: ['Mezcla todo.', 'Forma bolitas.', 'Hornea 11 minutos.'] },
  { nombre: 'Galletas de limón', tiempo: '25 min', dificultad: 'fácil', ingredientes: ['Mantequilla', 'Azúcar impalpable', 'Harina', 'Limón', 'Huevo'], pasos: ['Bate mantequilla y azúcar.', 'Agrega limón y harina.', 'Hornea 12 minutos.'] },
  { nombre: 'Galletas de avena y pasas', tiempo: '25 min', dificultad: 'fácil', ingredientes: ['Avena', 'Harina', 'Pasas', 'Mantequilla', 'Azúcar'], pasos: ['Mezcla secos.', 'Agrega mantequilla.', 'Hornea 12 minutos.'] },
  { nombre: 'Alfajores de maicena', tiempo: '35 min', dificultad: 'media', ingredientes: ['Maicena', 'Harina', 'Mantequilla', 'Dulce de leche', 'Coco'], pasos: ['Amasa y corta tapas.', 'Hornea 10 minutos.', 'Rellena y pasa por coco.'] },
  { nombre: 'Pepas de membrillo', tiempo: '30 min', dificultad: 'fácil', ingredientes: ['Mantequilla', 'Azúcar', 'Harina', 'Huevo', 'Membrillo'], pasos: ['Forma bolitas con hueco.', 'Rellena con membrillo.', 'Hornea 12 minutos.'] },
  { nombre: 'Galletas de maní', tiempo: '25 min', dificultad: 'fácil', ingredientes: ['Mantequilla de maní', 'Azúcar', 'Huevo', 'Harina', 'Vainilla'], pasos: ['Mezcla todo.', 'Marca con tenedor.', 'Hornea 10 minutos.'] },
  { nombre: 'Galletas integrales', tiempo: '25 min', dificultad: 'fácil', ingredientes: ['Harina integral', 'Avena', 'Miel', 'Aceite', 'Canela'], pasos: ['Mezcla ingredientes.', 'Forma galletas.', 'Hornea 12 minutos.'] },
];

const RECETAS_HELADO: readonly Receta[] = [
  { nombre: 'Helado de vainilla', tiempo: '30 min', dificultad: 'media', ingredientes: ['500 ml de crema', '250 ml de leche', 'Azúcar', 'Vainilla', 'Yemas'], pasos: ['Calienta leche con vainilla.', 'Mezcla con yemas y azúcar.', 'Congela batiendo cada hora.'] },
  { nombre: 'Helado de chocolate', tiempo: '30 min', dificultad: 'media', ingredientes: ['Crema', 'Leche', 'Chocolate', 'Azúcar', 'Cacao'], pasos: ['Derrite chocolate en leche.', 'Mezcla con crema.', 'Congela 4 horas.'] },
  { nombre: 'Helado de frutilla', tiempo: '25 min', dificultad: 'fácil', ingredientes: ['500 g de frutillas', 'Crema', 'Azúcar', 'Limón'], pasos: ['Tritura las frutillas.', 'Mezcla con crema y azúcar.', 'Congela 4 horas.'] },
  { nombre: 'Helado de limón', tiempo: '20 min', dificultad: 'fácil', ingredientes: ['Jugo de limón', 'Agua', 'Azúcar', 'Ralladura'], pasos: ['Prepara almíbar.', 'Agrega limón.', 'Congela raspando cada hora.'] },
  { nombre: 'Helado de banana', tiempo: '10 min', dificultad: 'fácil', ingredientes: ['4 bananas congeladas', 'Leche', 'Miel', 'Vainilla'], pasos: ['Congela bananas en rodajas.', 'Procesa con leche.', 'Sirve cremoso.'] },
  { nombre: 'Helado de dulce de leche', tiempo: '25 min', dificultad: 'media', ingredientes: ['Crema', 'Dulce de leche', 'Leche', 'Vainilla'], pasos: ['Mezcla todo.', 'Lleva al freezer.', 'Bate cada hora 3 veces.'] },
  { nombre: 'Paletas de mango', tiempo: '15 min', dificultad: 'fácil', ingredientes: ['2 mangos', 'Azúcar', 'Limón', 'Agua'], pasos: ['Licúa el mango.', 'Llena moldes.', 'Congela 5 horas.'] },
  { nombre: 'Granizado de café', tiempo: '15 min', dificultad: 'fácil', ingredientes: ['Café fuerte', 'Azúcar', 'Hielo', 'Crema'], pasos: ['Endulza el café.', 'Congela 2 horas.', 'Raspa y sirve con crema.'] },
];

const RECETAS_LICUADO: readonly Receta[] = [
  { nombre: 'Licuado de banana', tiempo: '8 min', dificultad: 'fácil', ingredientes: ['2 bananas', '500 ml de leche', 'Azúcar', 'Vainilla'], pasos: ['Pela las bananas.', 'Licúa 1 minuto.', 'Sirve frío.'] },
  { nombre: 'Licuado de frutilla', tiempo: '8 min', dificultad: 'fácil', ingredientes: ['2 tazas de frutillas', 'Leche', 'Azúcar', 'Hielo'], pasos: ['Lava las frutillas.', 'Licúa todo.', 'Sirve fresco.'] },
  { nombre: 'Licuado de durazno', tiempo: '8 min', dificultad: 'fácil', ingredientes: ['3 duraznos', 'Leche', 'Azúcar', 'Hielo'], pasos: ['Pela y corta duraznos.', 'Licúa con leche.', 'Sirve frío.'] },
  { nombre: 'Licuado verde', tiempo: '8 min', dificultad: 'fácil', ingredientes: ['Espinaca', 'Manzana verde', 'Banana', 'Agua'], pasos: ['Lava todo.', 'Licúa 1 minuto.', 'Sirve sin colar.'] },
  { nombre: 'Licuado de mango', tiempo: '8 min', dificultad: 'fácil', ingredientes: ['2 mangos', 'Yogur', 'Miel', 'Hielo'], pasos: ['Pela los mangos.', 'Licúa con yogur.', 'Sirve cremoso.'] },
  { nombre: 'Licuado de avena y manzana', tiempo: '10 min', dificultad: 'fácil', ingredientes: ['1 manzana', 'Avena', 'Leche', 'Canela'], pasos: ['Corta la manzana.', 'Licúa todo.', 'Sirve con canela.'] },
  { nombre: 'Licuado de chocolate', tiempo: '8 min', dificultad: 'fácil', ingredientes: ['Leche', 'Cacao', 'Banana', 'Azúcar'], pasos: ['Mezcla todo.', 'Licúa 1 minuto.', 'Sirve con hielo.'] },
  { nombre: 'Licuado de arándanos', tiempo: '8 min', dificultad: 'fácil', ingredientes: ['1 taza de arándanos', 'Yogur', 'Miel', 'Leche'], pasos: ['Lava los arándanos.', 'Licúa con yogur.', 'Sirve frío.'] },
];

const RECETAS_CENA_RAPIDA: readonly Receta[] = [
  { nombre: 'Fideos con manteca', tiempo: '12 min', dificultad: 'fácil', ingredientes: ['400 g de fideos', 'Mantequilla', 'Queso rallado', 'Sal'], pasos: ['Hierve los fideos.', 'Mezcla con mantequilla.', 'Agrega queso.'] },
  { nombre: 'Omelette exprés', tiempo: '8 min', dificultad: 'fácil', ingredientes: ['3 huevos', 'Queso', 'Jamón', 'Sal'], pasos: ['Bate los huevos.', 'Cocina en sartén.', 'Rellena y dobla.'] },
  { nombre: 'Tostadas caprese', tiempo: '10 min', dificultad: 'fácil', ingredientes: ['Pan', 'Tomate', 'Mozzarella', 'Albahaca'], pasos: ['Tuesta el pan.', 'Agrega tomate y queso.', 'Gratina 3 minutos.'] },
  { nombre: 'Burritos rápidos', tiempo: '15 min', dificultad: 'fácil', ingredientes: ['Tortillas', 'Pollo cocido', 'Queso', 'Salsa'], pasos: ['Calienta el pollo.', 'Rellena tortillas.', 'Dora en sartén.'] },
  { nombre: 'Ensalada de atún exprés', tiempo: '8 min', dificultad: 'fácil', ingredientes: ['Atún', 'Lechuga', 'Tomate', 'Mayonesa'], pasos: ['Pica las verduras.', 'Mezcla con atún.', 'Adereza.'] },
  { nombre: 'Sopa instantánea mejorada', tiempo: '10 min', dificultad: 'fácil', ingredientes: ['Sopa instantánea', 'Huevo', 'Cebolla de verdeo', 'Queso'], pasos: ['Prepara la sopa.', 'Agrega huevo batido.', 'Termina con verdeo.'] },
  { nombre: 'Pan pita con hummus', tiempo: '8 min', dificultad: 'fácil', ingredientes: ['Pan pita', 'Hummus', 'Tomate', 'Lechuga'], pasos: ['Calienta el pita.', 'Unta hummus.', 'Rellena con verduras.'] },
  { nombre: 'Arroz con huevo frito', tiempo: '12 min', dificultad: 'fácil', ingredientes: ['Arroz cocido', '2 huevos', 'Soja', 'Aceite'], pasos: ['Fríe los huevos.', 'Calienta el arroz.', 'Sirve con soja.'] },
];

export const cocina: Command = {
  data: new SlashCommandBuilder()
    .setName('cocina')
    .setDescription('Recetas caseras: 25 categorías 100% locales')
    .addSubcommand((s) => s.setName('desayuno').setDescription('Receta aleatoria de desayuno'))
    .addSubcommand((s) => s.setName('almuerzo').setDescription('Receta aleatoria de almuerzo'))
    .addSubcommand((s) => s.setName('cena').setDescription('Receta aleatoria de cena'))
    .addSubcommand((s) => s.setName('postre').setDescription('Receta aleatoria de postre'))
    .addSubcommand((s) => s.setName('bebida').setDescription('Receta aleatoria de bebida'))
    .addSubcommand((s) => s.setName('snack').setDescription('Receta aleatoria de snack'))
    .addSubcommand((s) => s.setName('ensalada').setDescription('Receta aleatoria de ensalada'))
    .addSubcommand((s) => s.setName('sopa').setDescription('Receta aleatoria de sopa'))
    .addSubcommand((s) => s.setName('pasta').setDescription('Receta aleatoria de pasta'))
    .addSubcommand((s) => s.setName('arroz').setDescription('Receta aleatoria de arroz'))
    .addSubcommand((s) => s.setName('pollo').setDescription('Receta aleatoria de pollo'))
    .addSubcommand((s) => s.setName('pescado').setDescription('Receta aleatoria de pescado'))
    .addSubcommand((s) => s.setName('carne').setDescription('Receta aleatoria de carne'))
    .addSubcommand((s) => s.setName('vegano').setDescription('Receta aleatoria vegana'))
    .addSubcommand((s) => s.setName('vegetariano').setDescription('Receta aleatoria vegetariana'))
    .addSubcommand((s) => s.setName('desayuno-dulce').setDescription('Receta aleatoria de desayuno dulce'))
    .addSubcommand((s) => s.setName('merienda').setDescription('Receta aleatoria de merienda'))
    .addSubcommand((s) => s.setName('pan').setDescription('Receta aleatoria de pan'))
    .addSubcommand((s) => s.setName('salsa').setDescription('Receta aleatoria de salsa'))
    .addSubcommand((s) => s.setName('guarnicion').setDescription('Receta aleatoria de guarnición'))
    .addSubcommand((s) => s.setName('torta').setDescription('Receta aleatoria de torta'))
    .addSubcommand((s) => s.setName('galleta').setDescription('Receta aleatoria de galleta'))
    .addSubcommand((s) => s.setName('helado').setDescription('Receta aleatoria de helado'))
    .addSubcommand((s) => s.setName('licuado').setDescription('Receta aleatoria de licuado'))
    .addSubcommand((s) => s.setName('cena-rapida').setDescription('Receta aleatoria de cena rápida')),
  cooldown: 3,
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'desayuno') {
      const r = pick(RECETAS_DESAYUNO);
      await interaction.reply({ embeds: [Embeds.success(r.nombre, formatoReceta(r))] });
      return;
    }

    if (sub === 'almuerzo') {
      const r = pick(RECETAS_ALMUERZO);
      await interaction.reply({ embeds: [Embeds.success(r.nombre, formatoReceta(r))] });
      return;
    }

    if (sub === 'cena') {
      const r = pick(RECETAS_CENA);
      await interaction.reply({ embeds: [Embeds.success(r.nombre, formatoReceta(r))] });
      return;
    }

    if (sub === 'postre') {
      const r = pick(RECETAS_POSTRE);
      await interaction.reply({ embeds: [Embeds.success(r.nombre, formatoReceta(r))] });
      return;
    }

    if (sub === 'bebida') {
      const r = pick(RECETAS_BEBIDA);
      await interaction.reply({ embeds: [Embeds.success(r.nombre, formatoReceta(r))] });
      return;
    }

    if (sub === 'snack') {
      const r = pick(RECETAS_SNACK);
      await interaction.reply({ embeds: [Embeds.success(r.nombre, formatoReceta(r))] });
      return;
    }

    if (sub === 'ensalada') {
      const r = pick(RECETAS_ENSALADA);
      await interaction.reply({ embeds: [Embeds.success(r.nombre, formatoReceta(r))] });
      return;
    }

    if (sub === 'sopa') {
      const r = pick(RECETAS_SOPA);
      await interaction.reply({ embeds: [Embeds.success(r.nombre, formatoReceta(r))] });
      return;
    }

    if (sub === 'pasta') {
      const r = pick(RECETAS_PASTA);
      await interaction.reply({ embeds: [Embeds.success(r.nombre, formatoReceta(r))] });
      return;
    }

    if (sub === 'arroz') {
      const r = pick(RECETAS_ARROZ);
      await interaction.reply({ embeds: [Embeds.success(r.nombre, formatoReceta(r))] });
      return;
    }

    if (sub === 'pollo') {
      const r = pick(RECETAS_POLLO);
      await interaction.reply({ embeds: [Embeds.success(r.nombre, formatoReceta(r))] });
      return;
    }

    if (sub === 'pescado') {
      const r = pick(RECETAS_PESCADO);
      await interaction.reply({ embeds: [Embeds.success(r.nombre, formatoReceta(r))] });
      return;
    }

    if (sub === 'carne') {
      const r = pick(RECETAS_CARNE);
      await interaction.reply({ embeds: [Embeds.success(r.nombre, formatoReceta(r))] });
      return;
    }

    if (sub === 'vegano') {
      const r = pick(RECETAS_VEGANO);
      await interaction.reply({ embeds: [Embeds.success(r.nombre, formatoReceta(r))] });
      return;
    }

    if (sub === 'vegetariano') {
      const r = pick(RECETAS_VEGETARIANO);
      await interaction.reply({ embeds: [Embeds.success(r.nombre, formatoReceta(r))] });
      return;
    }

    if (sub === 'desayuno-dulce') {
      const r = pick(RECETAS_DESAYUNO_DULCE);
      await interaction.reply({ embeds: [Embeds.success(r.nombre, formatoReceta(r))] });
      return;
    }

    if (sub === 'merienda') {
      const r = pick(RECETAS_MERIENDA);
      await interaction.reply({ embeds: [Embeds.success(r.nombre, formatoReceta(r))] });
      return;
    }

    if (sub === 'pan') {
      const r = pick(RECETAS_PAN);
      await interaction.reply({ embeds: [Embeds.success(r.nombre, formatoReceta(r))] });
      return;
    }

    if (sub === 'salsa') {
      const r = pick(RECETAS_SALSA);
      await interaction.reply({ embeds: [Embeds.success(r.nombre, formatoReceta(r))] });
      return;
    }

    if (sub === 'guarnicion') {
      const r = pick(RECETAS_GUARNICION);
      await interaction.reply({ embeds: [Embeds.success(r.nombre, formatoReceta(r))] });
      return;
    }

    if (sub === 'torta') {
      const r = pick(RECETAS_TORTA);
      await interaction.reply({ embeds: [Embeds.success(r.nombre, formatoReceta(r))] });
      return;
    }

    if (sub === 'galleta') {
      const r = pick(RECETAS_GALLETA);
      await interaction.reply({ embeds: [Embeds.success(r.nombre, formatoReceta(r))] });
      return;
    }

    if (sub === 'helado') {
      const r = pick(RECETAS_HELADO);
      await interaction.reply({ embeds: [Embeds.success(r.nombre, formatoReceta(r))] });
      return;
    }

    if (sub === 'licuado') {
      const r = pick(RECETAS_LICUADO);
      await interaction.reply({ embeds: [Embeds.success(r.nombre, formatoReceta(r))] });
      return;
    }

    if (sub === 'cena-rapida') {
      const r = pick(RECETAS_CENA_RAPIDA);
      await interaction.reply({ embeds: [Embeds.success(r.nombre, formatoReceta(r))] });
      return;
    }

    await interaction.reply({ embeds: [Embeds.error('Desconocido', 'Subcomando no reconocido.')], ephemeral: true });
  },
};
