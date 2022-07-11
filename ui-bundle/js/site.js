

//page-versions.js
;(function () {
    'use strict'

    var toggle = document.querySelector('.page-versions .version-menu-toggle')
    if (!toggle) return

    var selector = document.querySelector('.page-versions')

    toggle.addEventListener('click', function (e) {
        selector.classList.toggle('is-active')
        e.stopPropagation() // trap event
    })

    document.documentElement.addEventListener('click', function () {
        selector.classList.remove('is-active')
    })
})()


//mobile-navbar.js
;(function () {
    'use strict'

    var navbarBurger = document.querySelector('.navbar-burger')
    if (!navbarBurger) return
    navbarBurger.addEventListener('click', toggleNavbarMenu.bind(navbarBurger))

    function toggleNavbarMenu (e) {
        e.stopPropagation() // trap event
        document.documentElement.classList.toggle('is-clipped--navbar')
        this.classList.toggle('is-active')
        var menu = document.getElementById(this.dataset.target)
        if (menu.classList.toggle('is-active')) {
            menu.style.maxHeight = ''
            var expectedMaxHeight = window.innerHeight - Math.round(menu.getBoundingClientRect().top)
            var actualMaxHeight = parseInt(window.getComputedStyle(menu).maxHeight, 10)
            if (actualMaxHeight !== expectedMaxHeight) menu.style.maxHeight = expectedMaxHeight + 'px'
        }
    }
})()

//fragment-jumper.js
;(function () {
    'use strict'

    var article = document.querySelector('article.doc')
    var toolbar = document.querySelector('.toolbar')

    function decodeFragment (hash) {
        return hash && (~hash.indexOf('%') ? decodeURIComponent(hash) : hash).slice(1)
    }

    function computePosition (el, sum) {
        return article.contains(el) ? computePosition(el.offsetParent, el.offsetTop + sum) : sum
    }

    function jumpToAnchor (e) {
        if (e) {
            if (e.altKey || e.ctrlKey) return
            window.location.hash = '#' + this.id
            e.preventDefault()
        }
        window.scrollTo(0, computePosition(this, 0) - toolbar.getBoundingClientRect().bottom)
    }

    window.addEventListener('load', function jumpOnLoad (e) {
        var fragment, target
        if ((fragment = decodeFragment(window.location.hash)) && (target = document.getElementById(fragment))) {
            jumpToAnchor.bind(target)()
            setTimeout(jumpToAnchor.bind(target), 0)
        }
        window.removeEventListener('load', jumpOnLoad)
    })

    Array.prototype.slice.call(document.querySelectorAll('a[href^="#"]')).forEach(function (el) {
        var fragment, target
        if ((fragment = decodeFragment(el.hash)) && (target = document.getElementById(fragment))) {
            el.addEventListener('click', jumpToAnchor.bind(target))
        }
    })
})()

//nav.js
;(function () {
    'use strict'

    var SECT_CLASS_RX = /^sect(\d)$/

    var navContainer = document.querySelector('.nav-container')
    var navToggle = document.querySelector('.nav-toggle')
    var nav = navContainer.querySelector('.nav')

    navToggle.addEventListener('click', showNav)
    navContainer.addEventListener('click', trapEvent)

    var menuPanel = navContainer.querySelector('[data-panel=menu]')
    if (!menuPanel) return
    var explorePanel = navContainer.querySelector('[data-panel=explore]')

    var currentPageItem = menuPanel.querySelector('.is-current-page')
    var originalPageItem = currentPageItem
    if (currentPageItem) {
        activateCurrentPath(currentPageItem)
        scrollItemToMidpoint(menuPanel, currentPageItem.querySelector('.nav-link'))
    } else {
        menuPanel.scrollTop = 0
    }

    find(menuPanel, '.nav-item-toggle').forEach(function (btn) {
        var li = btn.parentElement
        btn.addEventListener('click', toggleActive.bind(li))
        var navItemSpan = findNextElement(btn, '.nav-text')
        if (navItemSpan) {
            navItemSpan.style.cursor = 'pointer'
            navItemSpan.addEventListener('click', toggleActive.bind(li))
        }
    })

    if (explorePanel) {
        explorePanel.querySelector('.context').addEventListener('click', function () {
            // NOTE logic assumes there are only two panels
            find(nav, '[data-panel]').forEach(function (panel) {
                panel.classList.toggle('is-active')
            })
        })
    }

    // NOTE prevent text from being selected by double click
    menuPanel.addEventListener('mousedown', function (e) {
        if (e.detail > 1) e.preventDefault()
    })

    function onHashChange () {
        var navLink
        var hash = window.location.hash
        if (hash) {
            if (hash.indexOf('%')) hash = decodeURIComponent(hash)
            navLink = menuPanel.querySelector('.nav-link[href="' + hash + '"]')
            if (!navLink) {
                var targetNode = document.getElementById(hash.slice(1))
                if (targetNode) {
                    var current = targetNode
                    var ceiling = document.querySelector('article.doc')
                    while ((current = current.parentNode) && current !== ceiling) {
                        var id = current.id
                        // NOTE: look for section heading
                        if (!id && (id = SECT_CLASS_RX.test(current.className))) id = (current.firstElementChild || {}).id
                        if (id && (navLink = menuPanel.querySelector('.nav-link[href="#' + id + '"]'))) break
                    }
                }
            }
        }
        var navItem
        if (navLink) {
            navItem = navLink.parentNode
        } else if (originalPageItem) {
            navLink = (navItem = originalPageItem).querySelector('.nav-link')
        } else {
            return
        }
        if (navItem === currentPageItem) return
        find(menuPanel, '.nav-item.is-active').forEach(function (el) {
            el.classList.remove('is-active', 'is-current-path', 'is-current-page')
        })
        navItem.classList.add('is-current-page')
        currentPageItem = navItem
        activateCurrentPath(navItem)
        scrollItemToMidpoint(menuPanel, navLink)
    }

    if (menuPanel.querySelector('.nav-link[href^="#"]')) {
        if (window.location.hash) onHashChange()
        window.addEventListener('hashchange', onHashChange)
    }

    function activateCurrentPath (navItem) {
        var ancestorClasses
        var ancestor = navItem.parentNode
        while (!(ancestorClasses = ancestor.classList).contains('nav-menu')) {
            if (ancestor.tagName === 'LI' && ancestorClasses.contains('nav-item')) {
                ancestorClasses.add('is-active', 'is-current-path')
            }
            ancestor = ancestor.parentNode
        }
        navItem.classList.add('is-active')
    }

    function toggleActive () {
        if (this.classList.toggle('is-active')) {
            var padding = parseFloat(window.getComputedStyle(this).marginTop)
            var rect = this.getBoundingClientRect()
            var menuPanelRect = menuPanel.getBoundingClientRect()
            var overflowY = (rect.bottom - menuPanelRect.top - menuPanelRect.height + padding).toFixed()
            if (overflowY > 0) menuPanel.scrollTop += Math.min((rect.top - menuPanelRect.top - padding).toFixed(), overflowY)
        }
    }

    function showNav (e) {
        if (navToggle.classList.contains('is-active')) return hideNav(e)
        trapEvent(e)
        var html = document.documentElement
        html.classList.add('is-clipped--nav')
        navToggle.classList.add('is-active')
        navContainer.classList.add('is-active')
        var bounds = nav.getBoundingClientRect()
        var expectedHeight = window.innerHeight - Math.round(bounds.top)
        if (Math.round(bounds.height) !== expectedHeight) nav.style.height = expectedHeight + 'px'
        html.addEventListener('click', hideNav)
    }

    function hideNav (e) {
        trapEvent(e)
        var html = document.documentElement
        html.classList.remove('is-clipped--nav')
        navToggle.classList.remove('is-active')
        navContainer.classList.remove('is-active')
        html.removeEventListener('click', hideNav)
    }

    function trapEvent (e) {
        e.stopPropagation()
    }

    function scrollItemToMidpoint (panel, el) {
        if (!el) return;
        var rect = panel.getBoundingClientRect()
        var effectiveHeight = rect.height
        var navStyle = window.getComputedStyle(nav)
        if (navStyle.position === 'sticky') effectiveHeight -= rect.top - parseFloat(navStyle.top)
        panel.scrollTop = Math.max(0, (el.getBoundingClientRect().height - effectiveHeight) * 0.5 + el.offsetTop)
    }

    function find (from, selector) {
        return [].slice.call(from.querySelectorAll(selector))
    }

    function findNextElement (from, selector) {
        var el = from.nextElementSibling
        return el && selector ? el[el.matches ? 'matches' : 'msMatchesSelector'](selector) && el : el
    }
})()






//on-this-page.js
;(function () {
    'use strict'

    var sidebar = document.querySelector('aside.toc.sidebar')
    if (!sidebar) return
    if (document.querySelector('body.-toc')) return sidebar.parentNode.removeChild(sidebar)
    var levels = parseInt(sidebar.dataset.levels || 2, 10)
    if (levels < 0) return

    var articleSelector = 'article.doc'
    var article = document.querySelector(articleSelector)
    var headingsSelector = []
    for (var level = 0; level <= levels; level++) {
        var headingSelector = [articleSelector]
        if (level) {
            for (var l = 1; l <= level; l++) headingSelector.push((l === 2 ? '.sectionbody>' : '') + '.sect' + l)
            headingSelector.push('h' + (level + 1) + '[id]')
        } else {
            headingSelector.push('h1[id].sect0')
        }
        headingsSelector.push(headingSelector.join('>'))
    }
    var headings = find(headingsSelector.join(','), article.parentNode)
    if (!headings.length) return sidebar.parentNode.removeChild(sidebar)

    var lastActiveFragment
    var links = {}
    var list = headings.reduce(function (accum, heading) {
        var link = document.createElement('a')
        link.textContent = heading.textContent
        links[(link.href = '#' + heading.id)] = link
        var listItem = document.createElement('li')
        listItem.dataset.level = parseInt(heading.nodeName.slice(1), 10) - 1
        listItem.appendChild(link)
        accum.appendChild(listItem)
        return accum
    }, document.createElement('ul'))

    var menu = sidebar.querySelector('.toc-menu')
    if (!menu) (menu = document.createElement('div')).className = 'toc-menu'

    var title = document.createElement('h3')
    title.textContent = sidebar.dataset.title || 'Contents'
    menu.appendChild(title)
    menu.appendChild(list)

    var startOfContent = !document.getElementById('toc') && article.querySelector('h1.page ~ :not(.is-before-toc)')
    if (startOfContent) {
        var embeddedToc = document.createElement('aside')
        embeddedToc.className = 'toc embedded'
        embeddedToc.appendChild(menu.cloneNode(true))
        startOfContent.parentNode.insertBefore(embeddedToc, startOfContent)
    }

    window.addEventListener('load', function () {
        onScroll()
        window.addEventListener('scroll', onScroll)
    })

    function onScroll () {
        var scrolledBy = window.pageYOffset
        var buffer = getNumericStyleVal(document.documentElement, 'fontSize') * 1.15
        var ceil = article.offsetTop
        if (scrolledBy && window.innerHeight + scrolledBy + 2 >= document.documentElement.scrollHeight) {
            lastActiveFragment = Array.isArray(lastActiveFragment) ? lastActiveFragment : Array(lastActiveFragment || 0)
            var activeFragments = []
            var lastIdx = headings.length - 1
            headings.forEach(function (heading, idx) {
                var fragment = '#' + heading.id
                if (idx === lastIdx || heading.getBoundingClientRect().top + getNumericStyleVal(heading, 'paddingTop') > ceil) {
                    activeFragments.push(fragment)
                    if (lastActiveFragment.indexOf(fragment) < 0) links[fragment].classList.add('is-active')
                } else if (~lastActiveFragment.indexOf(fragment)) {
                    links[lastActiveFragment.shift()].classList.remove('is-active')
                }
            })
            list.scrollTop = list.scrollHeight - list.offsetHeight
            lastActiveFragment = activeFragments.length > 1 ? activeFragments : activeFragments[0]
            return
        }
        if (Array.isArray(lastActiveFragment)) {
            lastActiveFragment.forEach(function (fragment) {
                links[fragment].classList.remove('is-active')
            })
            lastActiveFragment = undefined
        }
        var activeFragment
        headings.some(function (heading) {
            if (heading.getBoundingClientRect().top + getNumericStyleVal(heading, 'paddingTop') - buffer > ceil) return true
            activeFragment = '#' + heading.id
        })
        if (activeFragment) {
            if (activeFragment === lastActiveFragment) return
            if (lastActiveFragment) links[lastActiveFragment].classList.remove('is-active')
            var activeLink = links[activeFragment]
            activeLink.classList.add('is-active')
            if (list.scrollHeight > list.offsetHeight) {
                list.scrollTop = Math.max(0, activeLink.offsetTop + activeLink.offsetHeight - list.offsetHeight)
            }
            lastActiveFragment = activeFragment
        } else if (lastActiveFragment) {
            links[lastActiveFragment].classList.remove('is-active')
            lastActiveFragment = undefined
        }
    }

    function find (selector, from) {
        return [].slice.call((from || document).querySelectorAll(selector))
    }

    function getNumericStyleVal (el, prop) {
        return parseFloat(window.getComputedStyle(el)[prop])
    }
})()

