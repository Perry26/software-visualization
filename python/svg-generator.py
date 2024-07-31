import os
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webelement import WebElement
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.support.wait import WebDriverWait

def element(s: str) -> WebElement:
    return driver.find_element(By.CSS_SELECTOR, s)

# First, find out which files we have yet to render
allJsonFiles = list(map(lambda s: s.split('.')[0], os.listdir('output-data/json/')))
allRenderedFiles = list(map(lambda s: s.split('.')[0], os.listdir('output-images/svg/')))

fileNames = list(filter(lambda s: s not in allRenderedFiles, allJsonFiles))

for f in fileNames:
    print(f"Starting {f}")
    # Load the page
    options = Options()
    options.add_argument("--headless")
    driver = webdriver.Firefox(options=options)
    driver.get('http://localhost:5173/export-svg')


    # Give input
    json_uploader = element("#json-uploader")
    json_uploader.send_keys(os.getcwd()+"/input-data/jhotdraw-trc-sum-rs.json")
    hash_uploader = element("#drawSettings-uploader")
    hash_uploader.send_keys(os.getcwd()+f"/output-data/json/{f}.json")

    # Run generator and wait for result
    element("#run-button").click()

    # Wait for result
    wait = WebDriverWait(driver, 2000)
    wait.until(lambda _: element('#done-output').text == 'Done')

    # Get result
    svgText = element('#svg-for-file').get_attribute("value")

    # Write to file
    with open(f"output-images/svg/{f}.svg", "w") as f:
        f.write(svgText)

    #input("Press Enter to continue...")
    driver.quit()
    print(f"Finished {f}")
