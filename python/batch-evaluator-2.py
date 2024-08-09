import os
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webelement import WebElement
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.support.wait import WebDriverWait
from multiprocessing import Process, Lock
from random import choice


filename = 'k9mail-cls-output'

# First, find out which files we have yet to render
allDrawSettings = list(map(lambda s: s.split('.')[0], os.listdir('output-data/json/')))
allRenderedFiles = list(map(lambda s: s.split('.')[0], os.listdir('output-images/' + filename + '/')))

fileNames = list(filter(lambda s: s not in allRenderedFiles, allDrawSettings))

def chunks(l, n):
    """Yield n number of striped chunks from l."""
    for i in range(0, n):
        yield l[i::n]

failLock = Lock()
evalLock = Lock()
def run(files):
    for hash in files:
        # Load the page
        options = Options()
        options.add_argument("--headless") # For firefox
        driver = webdriver.Firefox(options=options)
        driver.get(f'http://localhost:517{choice([3,4,5,6])}/batch-eval-2')

        #Define helper: get element by id
        def element(s: str) -> WebElement:
            return driver.find_element(By.CSS_SELECTOR, s)

        # Give input
        json_uploader = element("#json-uploader")
        json_uploader.send_keys(os.getcwd()+"/input-data/" + filename + ".json")
        drawSettings_uploader = element("#drawSettings-uploader")
        drawSettings_uploader.send_keys(os.getcwd()+"/output-data/json/" + hash + ".json")

        # Run evaluation
        element("#run-button").click()

        # Wait for result
        wait = WebDriverWait(driver, 2000)
        wait.until(lambda _: element('#done-output').text == 'Done')

        # Parse results
        evaluationResult = element('#evaluation-output').text + ';' + hash
        failed = element('#failed-output').text
        svgText = element('#svg-output').get_attribute("value").replace("lineargradient", "linearGradient")

        # Write results
        if failed == 'Fail':
            with failLock:
               with open("output-data/fails-" + filename + ".csv", "a") as f:
                   print("Write fail: " + hash)
                   f.write(hash + ";" + filename + "\n")
        else:
            with evalLock:
                with open("output-data/evaluationResults-" + filename + ".csv", "a") as f:
                    print("Write Evaluation: " + hash)
                    f.write(evaluationResult + '\n')
            with open(f"output-images/{filename}/{hash}.svg", "w") as f:
                print("Write svg: " + hash)  
                f.write(svgText)

        driver.quit()
    print('thread done')

run(fileNames)
ch = list(chunks(fileNames, 5))
processes = []
for chunk in ch:
    p = Process(target = run, args = (chunk,))
    p.start()
    processes.append(p)

for p in processes:
    p.join()
print('bye!')