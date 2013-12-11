from __future__ import division
from bs4 import BeautifulSoup
import urllib2
import re
import json
import sys

requestURL = 'http://www.primewire.ag/index.php?tv=&page=1'
filename = 'primewireTV_temp.json'

req = urllib2.Request(requestURL)
response = urllib2.urlopen(req)
the_page = response.read()

soup = BeautifulSoup(the_page)

data = { 'TV Series' : []}

idChecked = []

#Get last page of tv series links
paginationDiv = soup.find("div", "pagination")
lastPageLink = paginationDiv.findAll("a", href=True)
lastPageURL = lastPageLink[-1]['href']
lastPageMatchObj = re.search(r'(.*=)([\d]+)', lastPageURL)
lastPage = int(lastPageMatchObj.group(2))

for page_no in range(1, (lastPage+1)):
    #Load page
    finalRequestURL = requestURL[:-1] + str(page_no)
    req = urllib2.Request(finalRequestURL)
    response = urllib2.urlopen(req)
    the_page = response.read()

    soup = BeautifulSoup(the_page)
    
    #Gets whole div of the TV Show
    tvShowDiv = soup.findAll("div", "index_item index_item_ie")

    for i in range(len(tvShowDiv)):
        #Find only the link containing watch url, title
        tvShowLink = tvShowDiv[i].find("a", href=True)
        tvShowImg = str(tvShowDiv[i].find("img")['src'])

        #Extract ID from watch url
        link = tvShowLink['href']
        tvShowNameFull = tvShowLink['title']

        #Extract TV Show's ID
        tvShowIDMatchObj = re.search(r'(.*-)([\d]+)(-)(.*)', link)
        tvShowID = tvShowIDMatchObj.group(2)
        #tvShowURLCode = tvShowIDMatchObj.group(4)

        #Extract TV Show's Name
        tvShowNameMatchObj = re.search(r'(Watch )(.*)', tvShowNameFull)
        tvShowName = tvShowNameMatchObj.group(2)

        #Create JSON type object
        #TVShowObject = { 'name':tvShowName, 'url':str(tvShowID), 'url_name':tvShowURLCode}
        TVShowObject = { 'name':tvShowName, 'url':str(link[1:]), 'image':tvShowImg}

        data['TV Series'].append(TVShowObject)

#Create JSON data dump
data_string = json.dumps(data, indent=4, separators=(',', ': '))

#print data_string

#Write to JSON format file
f = open(filename,'w')

f.write(data_string)

f.close()
