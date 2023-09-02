import logging
import tempfile
import os
from docx import Document
from pypdf import PdfReader
import boto3
from sentry_sdk.integrations.aws_lambda import AwsLambdaIntegration
import sentry_sdk

# https://stackoverflow.com/questions/56818579/unable-to-import-lxml-etree-on-aws-lambda

logger = logging.getLogger()
logger.setLevel(logging.INFO)

sentry_sdk.init(
    dsn="https://00651930388f84074cf22192f8410569@o4505774316060672.ingest.sentry.io/4505802562338816",
    integrations=[AwsLambdaIntegration()],
    # Set traces_sample_rate to 1.0 to capture 100%
    # of transactions for performance monitoring.
    # We recommend adjusting this value in production.
    traces_sample_rate=1.0,
    # Set profiles_sample_rate to 1.0 to profile 100%
    # of sampled transactions.
    # We recommend adjusting this value in production.
    profiles_sample_rate=1.0,
)

s3 = boto3.client('s3')


def handler(event, context):
    # Get bucket and object key from the Lambda event trigger
    bucket = event['Records'][0]['s3']['bucket']['name']
    key = event['Records'][0]['s3']['object']['key']

    logger.info(f"Converting {key} in bucket {bucket}")

    # Determine the file type from the file extension
    file_type = key.split('.')[-1]

    # Create a temporary directory to store the downloaded file
    with tempfile.TemporaryDirectory() as tmp_dir:
        download_path = os.path.join(tmp_dir, 'downloaded_file')
        upload_path = os.path.join(tmp_dir, 'converted_file.md')

        # Download the file from S3
        s3.download_file(bucket, key, download_path)

        # Convert the file to Markdown
        if file_type == 'pdf':
            convert_pdf_to_md(download_path, upload_path)
        elif file_type in ['doc', 'docx']:
            convert_docx_to_md(download_path, upload_path)

        # Upload the Markdown file back to S3
        new_key = f"{key}.md"
        s3.upload_file(upload_path, bucket, new_key)


def convert_pdf_to_md(pdf_path, md_path):
    with open(pdf_path, 'rb') as f:
        pdf_reader = PdfReader(f)
        with open(md_path, 'w') as md_file:
            for page in pdf_reader.pages:
                md_file.write(page.extract_text())
                md_file.write('\n\n')


def convert_docx_to_md(docx_path, md_path):
    doc = Document(docx_path)
    with open(md_path, 'w') as md_file:
        for para in doc.paragraphs:
            md_file.write(para.text)
            md_file.write('\n\n')
