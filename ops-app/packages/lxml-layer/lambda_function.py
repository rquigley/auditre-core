from lxml import etree

def lambda_handler(event, context):
    print(__name__)
    print(etree.LXML_VERSION)
