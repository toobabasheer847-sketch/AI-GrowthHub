import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

from app.services.document_parser import DocumentParser


class DocumentParserTests(unittest.TestCase):
    def test_parser_extracts_text_from_csv_files(self):
        with TemporaryDirectory() as temp_dir:
            file_path = Path(temp_dir) / "contacts.csv"
            file_path.write_text("name,company\nAda Lovelace,Northwind Labs\n", encoding="utf-8")

            parser = DocumentParser()
            pages = parser.extract_pages(file_path)

            self.assertEqual(len(pages), 1)
            self.assertIn("Ada Lovelace", pages[0]["text"])
            self.assertIn("Northwind Labs", pages[0]["text"])


if __name__ == "__main__":
    unittest.main()
