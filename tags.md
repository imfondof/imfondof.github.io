---
layout : post_test
permalink: /tags/
title : 标签
---
{% for tag in site.tags %}{% assign count = tag | last | size %}{% assign fontsize = count | times: 4 %}{% if count  > 2 %}[{{ tag | first }}]({{ page.url }}?keyword={{ tag | first }} "{{ tag | first }}"){:.post-tags-item data-count="{{ count }}" style="font-size: {% if fontsize > 24 %}24{% else %}{{ fontsize }}{% endif %}px"}{% endif %}{% endfor %}

||
|日期|文章|
|----|----|
|    |    |
{:#tags-table style="display: none"}