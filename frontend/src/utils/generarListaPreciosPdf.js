import { jsPDF } from 'jspdf'

export function generarListaPreciosPdf({ nombreCarniceria, compra }) {
  const cortesFiltrados = [...compra.cortes]
    .filter((c) => parseFloat(c.precio_sugerido_kg) > 0)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const marginX = 15
  const pageW = doc.internal.pageSize.getWidth()
  let y = 20

  // Encabezado
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(nombreCarniceria, marginX, y)
  y += 8

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  const [anio, mes, dia] = compra.fecha.split('-')
  doc.text(`Fecha: ${dia}/${mes}/${anio}`, marginX, y)
  y += 6

  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('Lista de precios', marginX, y)
  y += 8

  // Línea separadora
  doc.setLineWidth(0.3)
  doc.line(marginX, y, pageW - marginX, y)
  y += 7

  // Tabla de cortes
  doc.setFontSize(11)
  const pageH = doc.internal.pageSize.getHeight()
  const footerY = pageH - 10

  for (const corte of cortesFiltrados) {
    if (y > footerY - 8) {
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(150)
      doc.text('Generado con La Balanza', pageW / 2, footerY, { align: 'center' })
      doc.setTextColor(0)
      doc.addPage()
      y = 20
    }

    const precio = `$${Math.round(parseFloat(corte.precio_sugerido_kg)).toLocaleString('es-AR')}/kg`
    doc.setFont('helvetica', 'normal')
    doc.text(corte.nombre, marginX, y)
    doc.setFont('helvetica', 'bold')
    doc.text(precio, pageW - marginX, y, { align: 'right' })
    y += 8
  }

  // Pie de página
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(150)
  doc.text('Generado con La Balanza', pageW / 2, footerY, { align: 'center' })

  doc.save(`lista-precios-${compra.fecha}.pdf`)
}
