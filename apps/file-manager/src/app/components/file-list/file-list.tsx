import React from 'react';
import styled from 'styled-components/native';
import { File } from '../file';

const FileList: React.FC = () => {
  return (
    <Container>
      <File
        title="Sample PDF"
        icon="pdffile1"
        path="./file-samples/sample-pdf.pdf"
      />
      <File
        title="Sample JPEG"
        icon="jpgfile1"
        path="./file-samples/sample-jpeg.jpg"
      />
      <File
        title="Sample Word Doc"
        icon="wordfile1"
        path="./file-samples/sample-word-doc.docx"
      />
    </Container>
  );
};

const Container = styled.View`
  padding: 20px;
`;

export { FileList };
