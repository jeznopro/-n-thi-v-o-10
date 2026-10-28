# -*- coding: utf-8 -*-
import docx
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls
import os
import sys

def build_exam_docx(output_path, title, subtitle, questions_data):
    doc = docx.Document()

    # Setup margins 2cm (0.8 inch)
    for section in doc.sections:
        section.top_margin = Inches(0.75)
        section.bottom_margin = Inches(0.75)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)

    # 1. Title
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_before = Pt(0)
    p_title.paragraph_format.space_after = Pt(2)
    run_title = p_title.add_run(title)
    run_title.bold = True
    run_title.font.name = 'Times New Roman'
    run_title.font.size = Pt(15)
    run_title.font.color.rgb = RGBColor(30, 58, 138)

    # 2. Subtitle
    if subtitle:
        p_sub = doc.add_paragraph()
        p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_sub.paragraph_format.space_after = Pt(3)
        run_sub = p_sub.add_run(subtitle)
        run_sub.bold = True
        run_sub.font.name = 'Times New Roman'
        run_sub.font.size = Pt(12)
        run_sub.font.color.rgb = RGBColor(15, 118, 110)

    # 3. Time limit
    p_time = doc.add_paragraph()
    p_time.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_time.paragraph_format.space_after = Pt(10)
    run_time = p_time.add_run('Thời gian làm bài: 90 phút (Không kể thời gian phát đề) - Môn: Toán THCS')
    run_time.italic = True
    run_time.font.name = 'Times New Roman'
    run_time.font.size = Pt(11)

    # 4. Notice Box Table
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    cell = tbl.cell(0, 0)
    cell.width = Inches(6.8)

    shd_xml = f'<w:shd {nsdecls("w")} w:fill="F0FDF4"/>'
    cell._tc.get_or_add_tcPr().append(parse_xml(shd_xml))

    borders_xml = f'''<w:tcBorders {nsdecls("w")}>
        <w:top w:val="single" w:sz="6" w:space="0" w:color="86EFAC"/>
        <w:left w:val="single" w:sz="24" w:space="0" w:color="16A34A"/>
        <w:bottom w:val="single" w:sz="6" w:space="0" w:color="86EFAC"/>
        <w:right w:val="single" w:sz="6" w:space="0" w:color="86EFAC"/>
    </w:tcBorders>'''
    cell._tc.get_or_add_tcPr().append(parse_xml(borders_xml))

    cp = cell.paragraphs[0]
    cp.paragraph_format.space_before = Pt(4)
    cp.paragraph_format.space_after = Pt(4)
    cp.paragraph_format.left_indent = Inches(0.1)
    cp.paragraph_format.right_indent = Inches(0.1)

    r_box_title = cp.add_run('📌 HƯỚNG DẪN SOẠN ĐỀ TỰ LUẬN CHUẨN ĐỂ HỆ THỐNG NHẬN DIỆN TỰ ĐỘNG:\n')
    r_box_title.bold = True
    r_box_title.font.name = 'Times New Roman'
    r_box_title.font.size = Pt(10.5)
    r_box_title.font.color.rgb = RGBColor(22, 101, 52)

    r_box_body = cp.add_run(
        '1. Tên mỗi câu hỏi bắt đầu bằng: Câu 1 (X điểm): hoặc Bài 1 (X.X điểm): để hệ thống tự động nhận diện câu và thang điểm.\n'
        '2. Công thức Toán học: Đặt trong cặp dấu $...$ (ví dụ: $AB \\parallel CD$, $\\widehat{A} = 110^\\circ$, $\\sqrt{x}$, $\\frac{a}{b}$).\n'
        '3. Thầy/Cô chỉ cần xóa hoặc chỉnh sửa nội dung các câu hỏi dưới đây và lưu lại file .docx để tải trực tiếp lên web!'
    )
    r_box_body.font.name = 'Times New Roman'
    r_box_body.font.size = Pt(10)
    r_box_body.font.color.rgb = RGBColor(51, 65, 85)

    doc.add_paragraph().paragraph_format.space_after = Pt(4)

    # 5. Questions
    for q in questions_data:
        # Header line: Câu X (X.X điểm): Tiêu đề
        p_q = doc.add_paragraph()
        p_q.paragraph_format.space_before = Pt(8)
        p_q.paragraph_format.space_after = Pt(3)
        p_q.paragraph_format.line_spacing = 1.15
        
        r_q_head = p_q.add_run(q['header'])
        r_q_head.bold = True
        r_q_head.font.name = 'Times New Roman'
        r_q_head.font.size = Pt(12)
        r_q_head.font.color.rgb = RGBColor(30, 58, 138)

        # Content lines
        for line in q['lines']:
            p_line = doc.add_paragraph()
            p_line.paragraph_format.space_before = Pt(0)
            p_line.paragraph_format.space_after = Pt(2)
            p_line.paragraph_format.line_spacing = 1.2
            
            r_line = p_line.add_run(line)
            r_line.font.name = 'Times New Roman'
            r_line.font.size = Pt(11.5)

        # If question has an image
        if 'image_path' in q and os.path.exists(q['image_path']):
            p_img = doc.add_paragraph()
            p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_img.paragraph_format.space_before = Pt(4)
            p_img.paragraph_format.space_after = Pt(4)
            
            # Add image in document
            width_in = q.get('image_width', Inches(3.2))
            p_img.add_run().add_picture(q['image_path'], width=width_in)

            # Add markdown image tag so Mammoth text extractor captures it for web import
            if 'image_tag' in q:
                p_tag = doc.add_paragraph()
                p_tag.alignment = WD_ALIGN_PARAGRAPH.CENTER
                p_tag.paragraph_format.space_after = Pt(4)
                r_tag = p_tag.add_run(q['image_tag'])
                r_tag.font.name = 'Times New Roman'
                r_tag.font.size = Pt(9.5)
                r_tag.italic = True
                r_tag.font.color.rgb = RGBColor(100, 116, 139)

    # 6. End of exam
    p_end = doc.add_paragraph()
    p_end.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_end.paragraph_format.space_before = Pt(14)
    p_end.paragraph_format.space_after = Pt(14)
    r_end = p_end.add_run('------------ HẾT ------------')
    r_end.bold = True
    r_end.italic = True
    r_end.font.name = 'Times New Roman'
    r_end.font.size = Pt(11)
    r_end.font.color.rgb = RGBColor(100, 116, 139)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    doc.save(output_path)
    print(f"Created Word exam: {output_path}")

if __name__ == '__main__':
    img_dir = 'F:/Toán 9/Web Ôn vào 10/public/images/geometry'

    # 25 Câu Hình học Hình bình hành
    geometry_questions = [
        {
            'header': 'Câu 1 (0.5 điểm): Các khẳng định về hình bình hành',
            'lines': [
                'Các câu sau đúng hay sai?',
                'a) Hình thang có hai cạnh đáy bằng nhau là hình bình hành.',
                'b) Hình thang có hai cạnh bên song song là hình bình hành.',
                'c) Tứ giác có hai cạnh đối bằng nhau là hình bình hành.',
                'd) Hình thang có hai cạnh bên bằng nhau là hình bình hành.'
            ]
        },
        {
            'header': 'Câu 2 (0.5 điểm): Điều kiện để tứ giác là hình bình hành',
            'lines': [
                'Tứ giác $ABCD$ là hình bình hành nếu:',
                '(A) $AB = CD$;',
                '(B) $AD = BC$;',
                '(C) $AB \\parallel CD$ và $AD = BC$;',
                '(D) $AB = BC$ và $CD = DA$;',
                '(E) $AB = CD$ và $AD = BC$.',
                'Hãy chọn phương án đúng.'
            ]
        },
        {
            'header': 'Câu 3 (0.5 điểm): Nhận biết hình bình hành qua góc và cạnh',
            'lines': [
                'Trong các tứ giác trên Hình 27, tứ giác nào là hình bình hành? Giải thích vì sao.'
            ],
            'image_path': f'{img_dir}/hinh27.png',
            'image_width': Inches(4.2),
            'image_tag': '![Hình 27](/images/geometry/hinh27.png)'
        },
        {
            'header': 'Câu 4 (0.5 điểm): Phân giác hai góc đối của hình bình hành',
            'lines': [
                'Cho hình bình hành $ABCD$. Tia phân giác của góc $A$ cắt $CD$ ở $M$. Tia phân giác của góc $C$ cắt $AB$ ở $N$. Chứng minh rằng tứ giác $AMCN$ là hình bình hành.'
            ]
        },
        {
            'header': 'Câu 5 (0.5 điểm): Chứng minh tứ giác hình bình hành có các đường vuông góc',
            'lines': [
                'Trên Hình 28, cho $ABCD$ là hình bình hành. Kẻ $AE \\perp BD$ tại $E$ và $CF \\perp BD$ tại $F$. Chứng minh rằng tứ giác $AECF$ là hình bình hành.'
            ],
            'image_path': f'{img_dir}/hinh28.png',
            'image_width': Inches(3.0),
            'image_tag': '![Hình 28](/images/geometry/hinh28.png)'
        },
        {
            'header': 'Câu 6 (0.5 điểm): Đối xứng qua trung điểm cạnh tam giác',
            'lines': [
                'Cho tam giác $ABC$, $D$ là trung điểm của $AB$, $E$ là trung điểm của $AC$. Gọi $O$ là một điểm bất kì nằm bên trong tam giác $ABC$. Vẽ điểm $M$ đối xứng với $O$ qua $D$, vẽ điểm $N$ đối xứng với $O$ qua $E$. Chứng minh rằng tứ giác $MNCB$ là hình bình hành.'
            ]
        },
        {
            'header': 'Câu 7 (0.5 điểm): Đường thẳng qua tâm hình bình hành',
            'lines': [
                'Cho hình bình hành $ABCD$, $O$ là giao điểm của hai đường chéo. Qua $O$, vẽ đường thẳng cắt hai cạnh $AB, CD$ ở $E, F$. Qua $O$ vẽ đường thẳng cắt hai cạnh $AD, BC$ ở $G, H$. Chứng minh rằng tứ giác $EGFH$ là hình bình hành.'
            ]
        },
        {
            'header': 'Câu 8 (0.5 điểm): Tính số đo các góc của hình bình hành',
            'lines': [
                'Tính các góc của hình bình hành $ABCD$, biết:',
                'a) $\\widehat{A} = 110^\\circ$;',
                'b) $\\widehat{A} - \\widehat{B} = 20^\\circ$.'
            ]
        },
        {
            'header': 'Câu 9 (0.5 điểm): Nối trung điểm hai cạnh đối của hình bình hành',
            'lines': [
                'Cho hình bình hành $ABCD$. Gọi $E$ là trung điểm của $AB$, $F$ là trung điểm của $CD$. Chứng minh rằng $DE = BF$.'
            ]
        },
        {
            'header': 'Câu 10 (0.5 điểm): Trung tuyến tam giác và đường vuông góc',
            'lines': [
                'Cho tam giác $ABC$ ($AB < BC$), đường trung tuyến $BM$. Gọi $D$ và $E$ là chân các đường vuông góc kẻ từ $A$ và $C$ đến đường thẳng $BM$. Chứng minh rằng $AE \\parallel CD$.'
            ]
        },
        {
            'header': 'Câu 11 (0.5 điểm): Chu vi hình bình hành và tam giác',
            'lines': [
                'Chu vi hình bình hành $ABCD$ bằng $10\\text{ cm}$, chu vi tam giác $ABD$ bằng $9\\text{ cm}$. Tính độ dài đường chéo $BD$.'
            ]
        },
        {
            'header': 'Câu 12 (0.5 điểm): Chứng minh hai đoạn thẳng song song trên đường chéo',
            'lines': [
                'Trên Hình 29, cho $ABCD$ là hình bình hành. Trên đường chéo $BD$ lấy hai điểm $E$ và $F$ sao cho $DF = BE$. Chứng minh rằng $AE \\parallel CF$.'
            ],
            'image_path': f'{img_dir}/hinh29.png',
            'image_width': Inches(2.8),
            'image_tag': '![Hình 29](/images/geometry/hinh29.png)'
        },
        {
            'header': 'Câu 13 (0.5 điểm): Đoạn thẳng qua tâm đối xứng của hình bình hành',
            'lines': [
                'Cho hình bình hành $ABCD$, $O$ là giao điểm của hai đường chéo. Đường thẳng đi qua $O$ cắt hai cạnh đối $AD, BC$ ở $E, F$. Chứng minh rằng các điểm $E$ và $F$ đối xứng với nhau qua điểm $O$.'
            ]
        },
        {
            'header': 'Câu 14 (0.5 điểm): Đối xứng qua tâm của chân đường vuông góc',
            'lines': [
                'Cho Hình 30, trong đó $ABCD$ là hình bình hành tâm $O$. Kẻ $AH \\perp BD$ tại $H$ và $CK \\perp BD$ tại $K$. Chứng minh rằng các điểm $H$ và $K$ đối xứng với nhau qua điểm $O$.'
            ],
            'image_path': f'{img_dir}/hinh30.png',
            'image_width': Inches(2.8),
            'image_tag': '![Hình 30](/images/geometry/hinh30.png)'
        },
        {
            'header': 'Câu 15 (0.5 điểm): Dựng tam giác đều ra phía ngoài hình bình hành',
            'lines': [
                'Cho hình bình hành $ABCD$ có $\\widehat{A} = \\alpha > 90^\\circ$. Ở phía ngoài hình bình hành, vẽ các tam giác đều $ADF$ và $ABE$.',
                'a) Tính số đo góc $\\widehat{EAF}$ theo $\\alpha$.',
                'b) Chứng minh rằng tam giác $CEF$ là tam giác đều.'
            ]
        },
        {
            'header': 'Câu 16 (0.5 điểm): Tam giác vuông cân và hình bình hành ngoài',
            'lines': [
                'Cho tam giác $ABC$. Ở phía ngoài tam giác, vẽ các tam giác vuông cân tại $A$ là $\\Delta ABD$ và $\\Delta ACE$. Vẽ hình bình hành $ADIE$. Chứng minh rằng:',
                'a) $IA = BC$;',
                'b) $IA \\perp BC$.'
            ]
        },
        {
            'header': 'Câu 17 (0.5 điểm): Tính đáy hình thang dựa vào góc và cạnh',
            'lines': [
                'Cho hình thang $ABCD$ ($AB \\parallel CD$) có $\\widehat{C} = 55^\\circ$, $\\widehat{D} = 70^\\circ$, $AB = 1\\text{ cm}$, $AD = 4\\text{ cm}$. Tính độ dài đáy $CD$.'
            ]
        },
        {
            'header': 'Câu 18 (0.5 điểm): Diện tích tứ giác ghép từ tam giác vuông và hình bình hành',
            'lines': [
                'Cho tam giác $ABC$ vuông tại $A$, $AB = 6\\text{ cm}$, $BC = 10\\text{ cm}$, điểm $D$ thuộc cạnh $BC$. Vẽ hình bình hành $ACDE$. Tính diện tích tứ giác $AEBD$.'
            ]
        },
        {
            'header': 'Câu 19 (0.5 điểm): Tính diện tích hình bình hành biết góc xen giữa',
            'lines': [
                'Tính diện tích hình bình hành có hai cạnh là $6\\text{ cm}$ và $10\\text{ cm}$, góc xen giữa hai cạnh đó bằng $30^\\circ$.'
            ]
        },
        {
            'header': 'Câu 20 (0.5 điểm): Khoảng cách từ trung điểm cạnh bên đến cạnh đáy',
            'lines': [
                'Cho hình thang $ABCD$ có đáy $AD = 6\\text{ cm}$, khoảng cách từ trung điểm $M$ của cạnh $BC$ đến $AD$ bằng $3\\text{ cm}$. Qua $M$ kẻ đường thẳng song song với $AD$ cắt các đường thẳng $AB$ và $CD$ lần lượt ở $E$ và $F$.',
                'a) Tứ giác $AEFD$ là hình gì?',
                'b) Tính diện tích hình thang $ABCD$.'
            ]
        },
        {
            'header': 'Câu 21 (0.5 điểm): Tỉ số diện tích trong hình bình hành',
            'lines': [
                'Cho hình bình hành $ABCD$ có diện tích bằng $S$, điểm $M$ là trung điểm của $AD$. Gọi $I$ là giao điểm của $BM$ và $AC$. Tính diện tích tứ giác $MICD$ theo $S$.'
            ]
        },
        {
            'header': 'Câu 22 (0.5 điểm): Đối xứng điểm qua đỉnh hình bình hành',
            'lines': [
                'Cho Hình 31, trong đó $ABCD$ là hình bình hành. Lấy điểm $M$ sao cho $B$ là trung điểm của $AM$, lấy điểm $N$ sao cho $D$ là trung điểm của $AN$. Chứng minh rằng điểm $M$ đối xứng với điểm $N$ qua điểm $C$.'
            ],
            'image_path': f'{img_dir}/hinh31.png',
            'image_width': Inches(2.6),
            'image_tag': '![Hình 31](/images/geometry/hinh31.png)'
        },
        {
            'header': 'Câu 23 (0.5 điểm): Đối xứng điểm trong tam giác có đường thẳng song song',
            'lines': [
                'Cho Hình 32, trong đó điểm $D$ thuộc cạnh $BC$ của tam giác $ABC$, $DE \\parallel AB$ ($E \\in AC$), $DF \\parallel AC$ ($F \\in AB$), $I$ là trung điểm của đoạn thẳng $AD$. Chứng minh rằng điểm $E$ đối xứng với điểm $F$ qua điểm $I$.'
            ],
            'image_path': f'{img_dir}/hinh32.png',
            'image_width': Inches(2.6),
            'image_tag': '![Hình 32](/images/geometry/hinh32.png)'
        },
        {
            'header': 'Câu 24 (0.5 điểm): Hình bình hành tạo bởi giao điểm các đoạn thẳng',
            'lines': [
                'Cho hình bình hành $ABCD$. Gọi $E, F$ theo thứ tự là trung điểm của $AB, CD$. Gọi $M$ là giao điểm của $AF$ và $DE$, $N$ là giao điểm của $BF$ và $CE$. Chứng minh rằng:',
                'a) Tứ giác $EMFN$ là hình bình hành;',
                'b) Các đường thẳng $AC, EF, MN$ đồng quy tại một điểm.'
            ]
        },
        {
            'header': 'Câu 25 (0.5 điểm): Tính chất đồng quy của các đường chéo tứ giác nội tiếp',
            'lines': [
                'Trên Hình 33, cho tứ giác $ABCD$ là hình bình hành. Lấy các điểm $E, G, F, H$ lần lượt trên các cạnh $AB, BC, CD, DA$ sao cho $AE = CF$ và $DH = BG$. Chứng minh rằng:',
                'a) Tứ giác $EGFH$ là hình bình hành;',
                'b) Bốn đường thẳng $AC, BD, EF, GH$ cùng đồng quy tại một điểm.'
            ],
            'image_path': f'{img_dir}/hinh33.png',
            'image_width': Inches(2.8),
            'image_tag': '![Hình 33](/images/geometry/hinh33.png)'
        }
    ]

    out_file1 = 'C:/Users/MinhTriet/Downloads/de_thi_hinh_binh_hanh_chuan.docx'
    out_file1_public = 'F:/Toán 9/Web Ôn vào 10/public/samples/de_thi_hinh_binh_hanh_chuan.docx'
    build_exam_docx(out_file1, 'ĐỀ BÀI TẬP TỰ LUYỆN MÔN TOÁN LỚP 9', 'CHUYÊN ĐỀ: TỨ GIÁC & HÌNH BÌNH HÀNH (CÓ HÌNH MINH HỌA)', geometry_questions)
    build_exam_docx(out_file1_public, 'ĐỀ BÀI TẬP TỰ LUYỆN MÔN TOÁN LỚP 9', 'CHUYÊN ĐỀ: TỨ GIÁC & HÌNH BÌNH HÀNH (CÓ HÌNH MINH HỌA)', geometry_questions)

    # Đề thi 15 câu Hệ phương trình bậc nhất hai ẩn
    algebra_questions = [
        {
            'header': 'Câu 1 (0.5 điểm): Nhận diện hệ phương trình bậc nhất hai ẩn',
            'lines': [
                'Hệ phương trình nào trong các phương trình sau là hệ phương trình bậc nhất hai ẩn?',
                'A. $\\begin{cases} x^2 - y = 3 \\\\ x + y = -1 \\end{cases}$',
                'B. $\\begin{cases} 2x + y = 6 \\\\ x - z = 5 \\end{cases}$',
                'C. $\\begin{cases} 3x + 2y = 5 \\\\ x = y \\end{cases}$',
                'D. $\\begin{cases} 2x + 3y + 4z = 5 \\\\ x + y + z = 1 \\\\ y + 2z = 3 \\end{cases}$'
            ]
        },
        {
            'header': 'Câu 2 (0.5 điểm): Số nghiệm của hệ phương trình chứa tham số',
            'lines': [
                'Cho hệ phương trình: $\\begin{cases} ax - y = a^2 \\\\ bx - y = b^2 \\end{cases}$. Lựa chọn phương án SAI:',
                'A. Với mọi cặp số $(a; b)$ hệ phương trình luôn có nghiệm.',
                'B. Khi $a \\ne b$ thì hệ phương trình có nghiệm duy nhất.',
                'C. Khi $a = b = 0$ thì hệ phương trình có nghiệm $y = 0$ và $x \\in \\mathbb{R}$.',
                'D. Tồn tại cặp số $(a; b)$ để hệ phương trình vô nghiệm.'
            ]
        },
        {
            'header': 'Câu 3 (0.5 điểm): Tìm tham số m để hệ phương trình vô nghiệm',
            'lines': [
                'Với giá trị nào của $m$ thì hệ phương trình sau vô nghiệm:',
                '$$\\begin{cases} mx + y = 2m \\\\ x + my = 4 \\end{cases}$$',
                'A. $m = \\pm 1$',
                'B. $m = 2$',
                'C. $m = \\pm 2$',
                'D. $m = -2$'
            ]
        },
        {
            'header': 'Câu 4 (0.5 điểm): Tìm tham số m để hệ phương trình có nghiệm duy nhất',
            'lines': [
                'Với giá trị nào của $m$ thì hệ phương trình sau có nghiệm duy nhất:',
                '$$\\begin{cases} 4x + 3y = 1 \\\\ m^2x + 3y = 2m \\end{cases}$$',
                'A. $m = 2$',
                'B. $m = -2$',
                'C. $m = \\pm 2$',
                'D. $m \\ne \\pm 2$'
            ]
        },
        {
            'header': 'Câu 5 (0.5 điểm): Tìm tham số a để hệ phương trình có vô số nghiệm',
            'lines': [
                'Với giá trị nào của $a$ thì hệ phương trình sau có vô số nghiệm:',
                '$$\\begin{cases} ax + y = 2 \\\\ a^2x + 2y = 2a \\end{cases}$$',
                'A. $a = 2$',
                'B. $a = \\frac{1}{2}$',
                'C. $a = -2$',
                'D. $a = -\\frac{1}{2}$'
            ]
        },
        {
            'header': 'Câu 6 (0.5 điểm): Xác định tham số khi biết trước nghiệm của hệ phương trình',
            'lines': [
                'Với giá trị nào của $m$ thì hệ phương trình $\\begin{cases} m^2x + (m - 2)y = 2(m + 1) \\\\ x + 2my = 1 \\end{cases}$ có nghiệm $(x; y) = (3; -1)$?',
                'A. $m = 0$',
                'B. $m = 1$',
                'C. $m = -1$',
                'D. $m = 0$ hoặc $m = 1$'
            ]
        },
        {
            'header': 'Câu 7 (0.5 điểm): Tìm tham số để hai hệ phương trình tương đương',
            'lines': [
                'Tìm cặp giá trị $(a; b)$ để hai hệ phương trình sau tương đương:',
                '$$(I) \\begin{cases} x - 2y = 1 \\\\ x + y = 4 \\end{cases} \\quad \\text{và} \\quad (II) \\begin{cases} ax - y = 2 \\\\ 2ax + by = 7 \\end{cases}$$',
                'A. $(-1; -1)$',
                'B. $(1; 2)$',
                'C. $(-1; 1)$',
                'D. $(1; 1)$'
            ]
        },
        {
            'header': 'Câu 8 (0.5 điểm): Giải hệ phương trình bậc nhất hai ẩn cơ bản',
            'lines': [
                'Cặp số $(x; y)$ là nghiệm của hệ phương trình $\\begin{cases} 3x - 4y = -2 \\\\ 2x + y = 6 \\end{cases}$ là:',
                'A. $(-1; -2)$',
                'B. $(2; 2)$',
                'C. $(2; -1)$',
                'D. $(3; 2)$'
            ]
        },
        {
            'header': 'Câu 9 (0.5 điểm): Xác định hệ phương trình thỏa mãn nghiệm cho trước',
            'lines': [
                'Cho $\\begin{cases} x = 1 \\\\ y = 2 \\end{cases}$ là nghiệm của hệ phương trình bậc nhất 2 ẩn nào trong các hệ phương trình sau:',
                'A. $\\begin{cases} 2x - y = 0 \\\\ 3x + y = 4 \\end{cases}$',
                'B. $\\begin{cases} x + 3y = -2 \\\\ x - y = -1 \\end{cases}$',
                'C. $\\begin{cases} \\frac{1}{x+2} + \\frac{1}{y} = 1 \\\\ x + y = 3 \\end{cases}$',
                'D. $\\begin{cases} x + y = 3 \\\\ 4x - 3y = -2 \\end{cases}$'
            ]
        },
        {
            'header': 'Câu 10 (1.0 điểm): Giải hệ phương trình bằng phương pháp đặt ẩn phụ',
            'lines': [
                'Giải hệ phương trình sau bằng phương pháp đặt ẩn phụ:',
                '$$\\begin{cases} \\frac{2}{x + 2y} + \\frac{1}{2x + y} = 3 \\\\ \\frac{4}{x + 2y} + \\frac{3}{2x + y} = 1 \\end{cases}$$'
            ]
        },
        {
            'header': 'Câu 11 (1.0 điểm): Số nghiệm của hệ phương trình chứa dấu giá trị tuyệt đối',
            'lines': [
                'Tìm tất cả các cặp nghiệm $(x; y)$ của hệ phương trình sau:',
                '$$\\begin{cases} |x| + 4|y| = 18 \\\\ 3|x| + |y| = 10 \\end{cases}$$'
            ]
        },
        {
            'header': 'Câu 12 (1.0 điểm): Giải hệ phương trình chứa ẩn ở mẫu số',
            'lines': [
                'Giải hệ phương trình sau:',
                '$$\\begin{cases} \\frac{8}{x - 1} - \\frac{3}{y + 2} = 1 \\\\ \\frac{16}{x - 1} + \\frac{9}{y + 2} = 7 \\end{cases}$$'
            ]
        },
        {
            'header': 'Câu 13 (1.0 điểm): Giải hệ phương trình bằng phương pháp đặt ẩn phụ nâng cao',
            'lines': [
                'Giải hệ phương trình sau:',
                '$$\\begin{cases} \\frac{2}{x + y} + \\frac{3}{x - y} = 2 \\\\ \\frac{1}{x + y} + \\frac{2}{x - y} = \\frac{7}{6} \\end{cases}$$'
            ]
        },
        {
            'header': 'Câu 14 (1.0 điểm): Hệ phương trình biến đổi nâng cao quy về ẩn phụ',
            'lines': [
                'Giải hệ phương trình sau:',
                '$$\\begin{cases} x^2 + 1 + y(y + x) = 4y \\\\ (x^2 + 1)(y + x - 2) = y \\end{cases}$$'
            ]
        },
        {
            'header': 'Câu 15 (1.0 điểm): Tìm tham số để hệ phương trình đối xứng có nghiệm duy nhất',
            'lines': [
                'Với giá trị nào của tham số $m$ thì hệ phương trình sau có nghiệm duy nhất:',
                '$$\\begin{cases} x + y = 8 \\\\ \\frac{x}{y} + \\frac{y}{x} = m \\end{cases}$$'
            ]
        }
    ]

    out_file2 = 'C:/Users/MinhTriet/Downloads/de_thi_he_phuong_trinh_chuan.docx'
    out_file2_public = 'F:/Toán 9/Web Ôn vào 10/public/samples/de_thi_he_phuong_trinh_chuan.docx'
    build_exam_docx(out_file2, 'ĐỀ KIỂM TRA TỰ LUẬN MÔN TOÁN LỚP 9', 'CHUYÊN ĐỀ: GIẢI HỆ PHƯƠNG TRÌNH BẬC NHẤT HAI ẨN (CÓ GIẢI CHI TIẾT)', algebra_questions)
    build_exam_docx(out_file2_public, 'ĐỀ KIỂM TRA TỰ LUẬN MÔN TOÁN LỚP 9', 'CHUYÊN ĐỀ: GIẢI HỆ PHƯƠNG TRÌNH BẬC NHẤT HAI ẨN (CÓ GIẢI CHI TIẾT)', algebra_questions)

    print('Both Word documents created successfully!')
