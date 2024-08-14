import os
from typing import List
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webelement import WebElement
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.support.wait import WebDriverWait

# Load the page
options = Options()
options.add_argument("--headless")
driver = webdriver.Firefox(options=options)
driver.get('http://localhost:5173/batch-eval')

#Define helper: get element by id
def element(s: str) -> WebElement:
    return driver.find_element(By.CSS_SELECTOR, s)

def children(s: str) -> List[WebElement]:
    return driver.find_elements(By.CSS_SELECTOR, s + ' > *')


# Give input
json_uploader = element("#json-uploader")
fileNames = os.listdir('input-data/')
for f in fileNames:
    json_uploader.send_keys(os.getcwd()+'/input-data/' + f)

hash_uploader = element("#hashFile-uploader")
hash_uploader.send_keys(os.getcwd()+"/output-data/hashes")

# Run evaluation
element('#run-button').click()

# Wait for result
wait = WebDriverWait(driver, 2000)
wait.until(lambda _: element('#done-output').text == 'Done')

# Load results
hashes = [e.text for e in children('#hash-output')]
failed = [e.text for e in children('#failed-output')]
drawSettings: List[List[str]] = [[e.text, e.get_attribute('id')] for e in children('#settings-output')]
evaluations = [e.text for e in children('#evaluation-output')]
svg: List[List[str]] = [[e.text, e.get_attribute('id')] for e in children('#svg-output')]

# Now start outputting:
with open('output-data/hashes', 'a') as f:
    f.write('\n'.join(hashes) + '\n')

with open('output-data/fails.csv', 'a') as f:
    f.write('\n'.join(failed) + '\n')

for [text, id] in drawSettings:
    with open(f'output-data/json/{id}.json', 'w') as f:
        f.write(text)

with open('output-data/evaluationResults.csv', 'a') as f:
    f.write('\n'.join(evaluations) + '\n')

for [text, id] in svg:
    with open(f'output-data/svg/{id}.svg', 'w') as f:
        # (Below fixes a very weird bug)
        f.write(text.replace('lineargradient', 'linearGradient'))
        
driver.quit()
